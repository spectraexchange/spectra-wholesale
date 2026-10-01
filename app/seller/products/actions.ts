"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSeller } from "@/lib/auth";
import { CATEGORIES, CONTAINER_TYPES, STRAIN_TYPES, SUB_CATEGORIES, UNITS, type Category } from "@/lib/catalog";
import { createServiceClient } from "@/lib/supabase/server";

const MEDIA = {
  image: { bucket: "product-images", extensions: ["jpg", "jpeg", "png", "webp"] },
  coa: { bucket: "test-results", extensions: ["pdf", "jpg", "jpeg", "png"] },
} as const;
export type MediaKind = keyof typeof MEDIA;

const publicPrefix = (bucket: string, companyId: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${companyId}/`;

// Files go straight from the browser to storage through a signed upload URL,
// always inside the vendor's own company folder.
export async function createMediaUpload(kind: MediaKind, extension: string) {
  const { company } = await requireSeller();
  const media = MEDIA[kind];
  const ext = extension.toLowerCase().replace(/^\./, "");
  if (!media || !(media.extensions as readonly string[]).includes(ext)) {
    return { error: kind === "image" ? "Use a JPG, PNG or WebP image." : "Use a PDF, JPG or PNG." };
  }

  const path = `${company.id}/${crypto.randomUUID()}.${ext}`;
  const storage = createServiceClient().storage.from(media.bucket);
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error || !data) return { error: "Couldn’t start the upload. Try again." };

  return { path: data.path, token: data.token, bucket: media.bucket, publicUrl: storage.getPublicUrl(path).data.publicUrl };
}

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function saveProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const { company } = await requireSeller();
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const errors: Record<string, string> = {};

  const id = text("id") || null;
  const category = text("category") as Category;
  const subCategory = text("sub_category") || null;
  const number = (key: string) => (text(key) === "" ? null : Number(text(key)));

  const product = {
    name: text("name"),
    category,
    sub_category: subCategory,
    strain_type: text("strain_type") || "na",
    thc_percentage: number("thc_percentage"),
    description: text("description") || null,
    price_per_unit: number("price_per_unit"),
    unit: text("unit"),
    min_order_qty: number("min_order_qty"),
    stock_qty: number("stock_qty"),
    sku: text("sku") || null,
    container_type: text("container_type") || "none",
    is_active: formData.get("is_active") === "on",
    image_url: text("image_url") || null,
    test_results_url: text("test_results_url") || null,
  };

  if (!product.name) errors.name = "Give the product a name.";
  else if (product.name.length > 120) errors.name = "Keep it under 120 characters.";
  if (!CATEGORIES.some((c) => c.value === category)) errors.category = "Choose a category.";
  else if (subCategory && !SUB_CATEGORIES[category].some((s) => s.value === subCategory)) {
    errors.sub_category = "Choose a type from the list.";
  }
  if (!STRAIN_TYPES.some((s) => s.value === product.strain_type)) errors.strain_type = "Choose a strain type.";
  if (product.thc_percentage !== null && (!Number.isFinite(product.thc_percentage) || product.thc_percentage < 0 || product.thc_percentage > 100)) {
    errors.thc_percentage = "Enter a percentage from 0 to 100.";
  }
  if (product.price_per_unit === null || !Number.isFinite(product.price_per_unit) || product.price_per_unit <= 0) {
    errors.price_per_unit = "Enter a price above $0.";
  } else if (product.price_per_unit >= 1_000_000) {
    errors.price_per_unit = "That price looks too high.";
  } else {
    product.price_per_unit = Math.round(product.price_per_unit * 100) / 100;
  }
  if (!UNITS.some((u) => u.value === product.unit)) errors.unit = "Choose a unit.";
  if (product.stock_qty === null || !Number.isInteger(product.stock_qty) || product.stock_qty < 0) {
    errors.stock_qty = "Enter a whole number, 0 or more.";
  }
  if (product.min_order_qty !== null && (!Number.isInteger(product.min_order_qty) || product.min_order_qty < 1)) {
    errors.min_order_qty = "Enter a whole number, 1 or more.";
  }
  if (!CONTAINER_TYPES.some((c) => c.value === product.container_type)) errors.container_type = "Choose a container.";
  if (product.sku && product.sku.length > 40) errors.sku = "Keep the SKU under 40 characters.";
  if (product.description && product.description.length > 2000) errors.description = "Keep it under 2,000 characters.";
  // Media must live in this company's folder
  if (product.image_url && !product.image_url.startsWith(publicPrefix(MEDIA.image.bucket, company.id))) {
    errors.image_url = "Upload the photo again.";
  }
  if (product.test_results_url && !product.test_results_url.startsWith(publicPrefix(MEDIA.coa.bucket, company.id))) {
    errors.test_results_url = "Upload the test results again.";
  }

  if (Object.keys(errors).length) return { error: "Check the highlighted fields.", fieldErrors: errors };

  const service = createServiceClient();
  const { error } = id
    ? await service
        .from("products")
        .update({ ...product, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("seller_company_id", company.id)
    : await service.from("products").insert({ ...product, seller_company_id: company.id });

  if (error) {
    return {
      error:
        error.code === "23514" && /category/.test(error.message)
          ? "This category isn’t enabled in the database yet. Pick another for now."
          : "We couldn’t save the product. Try again.",
    };
  }

  revalidatePath("/seller/products");
  redirect(`/seller/products?saved=${encodeURIComponent(product.name)}`);
}

// Hide (is_active=false) keeps a product in the catalog list but off the buyer side;
// archive removes it from the vendor's working list. Both are reversible.
export async function updateProductStatus(id: string, change: { is_active?: boolean; is_archived?: boolean }) {
  const { company } = await requireSeller();
  const patch: Record<string, boolean | string> = { updated_at: new Date().toISOString() };
  if (typeof change.is_active === "boolean") patch.is_active = change.is_active;
  if (typeof change.is_archived === "boolean") patch.is_archived = change.is_archived;

  const { error } = await createServiceClient()
    .from("products")
    .update(patch)
    .eq("id", id)
    .eq("seller_company_id", company.id);
  if (error) return { error: "Couldn’t update the product." };

  revalidatePath("/seller/products");
  return { ok: true };
}
