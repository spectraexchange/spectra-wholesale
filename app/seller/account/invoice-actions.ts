"use server";

import { revalidatePath } from "next/cache";
import type { AccountFormState } from "@/lib/account-actions";
import { requireSeller } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

// Logos share the public product-images bucket, inside the vendor's own folder.
const LOGO_BUCKET = "product-images";
const LOGO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const ADMIN_ROLES = ["seller_admin"];

const logoPrefix = (companyId: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${LOGO_BUCKET}/${companyId}/`;

export async function createLogoUpload(extension: string) {
  const { company, role } = await requireSeller();
  if (!ADMIN_ROLES.includes(role)) return { error: "Only your company’s admin can change the logo." };
  const ext = extension.toLowerCase().replace(/^\./, "");
  if (!LOGO_EXTENSIONS.includes(ext)) return { error: "Use a JPG, PNG or WebP image." };

  const path = `${company.id}/logo-${crypto.randomUUID()}.${ext}`;
  const storage = createServiceClient().storage.from(LOGO_BUCKET);
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error || !data) return { error: "Couldn’t start the upload. Try again." };

  return { path: data.path, token: data.token, bucket: LOGO_BUCKET, publicUrl: storage.getPublicUrl(path).data.publicUrl };
}

const LIMITS = { invoice_payable_to: 600, invoice_terms: 1500, invoice_turnaround: 200, invoice_payment_terms: 40 } as const;

export async function saveInvoiceSettings(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const { company, role } = await requireSeller();
  if (!ADMIN_ROLES.includes(role)) return { error: "Only your company’s admin can change invoice settings." };

  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const logo = text("logo_url");
  const patch: Record<string, string | null> = { logo_url: logo || null };
  const errors: Record<string, string> = {};

  for (const [key, max] of Object.entries(LIMITS)) {
    const value = text(key);
    if (value.length > max) errors[key] = `Keep it under ${max.toLocaleString()} characters.`;
    patch[key] = value || null;
  }
  if (logo && !logo.startsWith(logoPrefix(company.id))) errors.logo_url = "Upload the logo again.";
  if (Object.keys(errors).length) return { fieldErrors: errors };

  const { error } = await createServiceClient().from("companies").update(patch).eq("id", company.id);
  if (error) return { error: error.code === "42703" ? "Run the invoices migration first." : "Couldn’t save invoice settings. Try again." };

  revalidatePath("/seller", "layout");
  revalidatePath("/buyer", "layout");
  return { ok: "Invoice settings saved. Every invoice, past and future, shows them." };
}
