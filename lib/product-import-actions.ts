"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { getViewer } from "@/lib/auth";
import { EXISTING_PRODUCT_COLUMNS, planRow, productIndex, type ExistingProduct, type ImportValues } from "@/lib/product-import";
import { createServiceClient } from "@/lib/supabase/server";

export type ImportResult = {
  row: number;
  status: "created" | "updated" | "skipped";
  name: string;
  error?: string;
  photo?: "saved" | "failed";
};

const IMAGE_BUCKET = "product-images";
const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_ROWS_PER_CALL = 50;

// Admins import for any vendor (companyId); vendors import into their own catalog.
async function targetCompany(companyId: string | null) {
  const viewer = await getViewer();
  if (!viewer) return { error: "Your session ended. Sign in again." } as const;

  if (companyId) {
    if (viewer.role !== "super_admin") return { error: "Only Spectra admins can import for another company." } as const;
    const { data } = await createServiceClient().from("companies").select("id, type").eq("id", companyId).maybeSingle();
    if (data?.type !== "seller") return { error: "Products can only be imported for vendors." } as const;
    return { viewer, companyId: data.id as string, asAdmin: true } as const;
  }

  if (!["seller", "seller_admin"].includes(viewer.role) || !viewer.company) return { error: "Only vendors can import products." } as const;
  if (!viewer.company.is_active || !viewer.company.is_approved) return { error: "This account is paused. Contact Spectra." } as const;
  return { viewer, companyId: viewer.company.id, asAdmin: false } as const;
}

/**
 * Imports one chunk of rows. The browser sends the file in chunks so a big
 * catalog shows progress and no single request runs long. Rows are re-planned
 * here against the live catalog; the browser preview is only advisory.
 */
export async function importProducts(
  companyId: string | null,
  rows: { row: number; values: ImportValues }[],
  seenKeys: string[],
): Promise<{ results?: ImportResult[]; seenKeys?: string[]; error?: string }> {
  const target = await targetCompany(companyId);
  if ("error" in target) return { error: target.error };
  if (rows.length > MAX_ROWS_PER_CALL) return { error: "Too many rows in one request." };

  const service = createServiceClient();
  const { data: existing, error: loadError } = await service
    .from("products")
    .select(EXISTING_PRODUCT_COLUMNS)
    .eq("seller_company_id", target.companyId);
  if (loadError) return { error: "Couldn’t load the current catalog. Try again." };

  const index = productIndex((existing ?? []) as unknown as ExistingProduct[]);
  const seen = new Set(seenKeys);
  const now = new Date().toISOString();

  const results = await mapLimit(rows, 5, async ({ row, values }): Promise<ImportResult> => {
    const plan = planRow(values, index, seen);
    if (plan.action === "skip") return { row, status: "skipped", name: plan.name, error: plan.error };

    let photo: ImportResult["photo"];
    let image_url: string | undefined;
    if (plan.imageUrl) {
      const stored = await copyImage(plan.imageUrl, target.companyId);
      photo = stored ? "saved" : "failed";
      if (stored) image_url = stored;
    }

    const record = { ...plan.product, ...(image_url && { image_url }) };
    const { error } =
      plan.action === "update"
        ? await service
            .from("products")
            .update({ ...record, is_archived: false, updated_at: now })
            .eq("id", plan.existingId!)
            .eq("seller_company_id", target.companyId)
        : await service.from("products").insert({ ...record, seller_company_id: target.companyId });

    if (error) {
      return {
        row,
        status: "skipped",
        name: plan.product.name,
        error: error.code === "23514" ? "The database rejected one of the values. Check category and unit." : "Couldn’t save this row.",
      };
    }
    return { row, status: plan.action === "update" ? "updated" : "created", name: plan.product.name, photo };
  });

  revalidatePath("/seller/products");
  revalidatePath("/buyer", "layout");
  revalidatePath(`/admin/companies/${target.companyId}`);
  return { results, seenKeys: [...seen] };
}

/** Logs a finished admin import on the company's activity feed. */
export async function finishImport(companyId: string, summary: { created: number; updated: number; skipped: number; file: string }) {
  const target = await targetCompany(companyId);
  if ("error" in target || !target.asAdmin) return;
  await audit({ adminId: target.viewer.id, action: "products_import", companyId: target.companyId, details: summary });
}

// Downloads a photo from the vendor's old platform and stores Spectra's own copy,
// so the catalog doesn't break when the old links go away.
async function copyImage(url: string, companyId: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  // Public web addresses only
  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || /^[\d.]+$/.test(host) || host.includes(":")) return null;

  try {
    const response = await fetch(parsed, {
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
      // Some image hosts refuse requests that don't identify themselves.
      headers: { "user-agent": "Mozilla/5.0 (compatible; SpectraWholesale/1.0; +https://spectrawholesale.com)", accept: "image/*" },
    });
    if (!response.ok) return null;
    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const ext = IMAGE_TYPES[type];
    if (!ext) return null;
    if (Number(response.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES) return null;
    const body = await response.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX_IMAGE_BYTES) return null;

    const storage = createServiceClient().storage.from(IMAGE_BUCKET);
    const path = `${companyId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await storage.upload(path, body, { contentType: type });
    if (error) return null;
    return storage.getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

// Runs rows a few at a time; photo downloads dominate and shouldn't all fire at once.
// Planning is synchronous, so rows still claim products in file order.
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}
