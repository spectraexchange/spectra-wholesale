"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ALLOWED_DOC_EXTENSIONS, LICENSE_BUCKET, LICENSE_DOCS, type LicenseDocKey } from "@/lib/access-requests";
import { getViewer } from "@/lib/auth";
import { ADMIN_EMAIL, licenseUpdatedEmail, sendEmail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/server";

// Licenses renew every year, so any user of an approved company can replace
// their documents from Account. Old files stay in storage as a record.

const slug = (doc: LicenseDocKey) => (doc === "mj_license_path" ? "mj" : "biz");

async function activeCompany() {
  const viewer = await getViewer();
  if (!viewer?.company) return { error: "Your session ended. Sign in again." } as const;
  if (!viewer.company.is_active || !viewer.company.is_approved) return { error: "This account is paused. Contact Spectra." } as const;
  return { viewer, company: viewer.company } as const;
}

export async function createLicenseUpload(doc: LicenseDocKey, extension: string) {
  const session = await activeCompany();
  if ("error" in session) return { error: session.error };
  const ext = extension.toLowerCase().replace(/^\./, "");
  if (!(doc in LICENSE_DOCS) || !ALLOWED_DOC_EXTENSIONS.includes(ext)) {
    return { error: "Upload a PDF or a photo (JPG, PNG, HEIC)." };
  }

  const path = `companies/${session.company.id}/${slug(doc)}-license-${crypto.randomUUID()}.${ext}`;
  const { data, error } = await createServiceClient().storage.from(LICENSE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "Couldn’t start the upload. Try again." };
  return { path: data.path, token: data.token };
}

export async function saveLicense(doc: LicenseDocKey, path: string): Promise<{ ok?: true; error?: string }> {
  const session = await activeCompany();
  if ("error" in session) return { error: session.error };
  const { viewer, company } = session;
  if (!(doc in LICENSE_DOCS)) return { error: "Unknown document." };

  // Only paths issued to this company for this document, and only once the file landed.
  const folder = `companies/${company.id}`;
  const pattern = new RegExp(`^${folder}/${slug(doc)}-license-[0-9a-f-]{36}\\.[a-z]+$`);
  if (!pattern.test(path)) return { error: "Upload failed. Choose the file again." };

  const service = createServiceClient();
  const { data: files } = await service.storage.from(LICENSE_BUCKET).list(folder, { search: path.slice(folder.length + 1) });
  if (!files?.some((f) => `${folder}/${f.name}` === path)) return { error: "Upload didn’t finish. Choose the file again." };

  const { error } = await service.from("companies").update({ [doc]: path }).eq("id", company.id);
  if (error) return { error: "Couldn’t save the document. Try again." };

  // Best effort: Spectra re-checks renewed licenses, but the upload stands either way.
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL;
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `License updated: ${company.name}`,
    html: licenseUpdatedEmail({
      company: company.name,
      document: LICENSE_DOCS[doc],
      name: viewer.fullName,
      reviewUrl: `${origin}/admin/companies/${company.id}`,
    }),
  }).catch(() => undefined);

  revalidatePath("/buyer/account");
  revalidatePath("/seller/account");
  revalidatePath(`/admin/companies/${company.id}`);
  return { ok: true };
}
