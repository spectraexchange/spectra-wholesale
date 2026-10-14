"use server";

import { revalidatePath } from "next/cache";
import { requireSeller } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

// Brand logo: shown to buyers on the vendor's storefront, products, cart,
// checkout and invoices. Stored in the public product-images bucket, inside
// the vendor's own folder.
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

/** Saves (or with null, removes) the logo right after upload. */
export async function saveLogo(url: string | null): Promise<{ error?: string }> {
  const { company, role } = await requireSeller();
  if (!ADMIN_ROLES.includes(role)) return { error: "Only your company’s admin can change the logo." };
  if (url && !url.startsWith(logoPrefix(company.id))) return { error: "Upload the logo again." };

  const { error } = await createServiceClient().from("companies").update({ logo_url: url }).eq("id", company.id);
  if (error) return { error: "Couldn’t save the logo. Try again." };

  revalidatePath("/seller", "layout");
  revalidatePath("/buyer", "layout");
  return {};
}
