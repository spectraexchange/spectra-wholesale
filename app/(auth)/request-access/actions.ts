"use server";

import { headers } from "next/headers";
import {
  ALLOWED_DOC_EXTENSIONS,
  LICENSE_BUCKET,
  LICENSE_DOCS,
  MENU_BUCKET,
  MENU_EXTENSIONS,
  parseAccessRequest,
  type FieldErrors,
  type LicenseDocKey,
} from "@/lib/access-requests";
import { ADMIN_EMAIL, newRequestEmail, sendEmail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/server";

export type UploadSlot = { path: string; token: string };

// License docs upload straight from the browser to private storage via signed URLs,
// which keeps large files out of the server action body (Vercel caps it at 4.5 MB).
export async function createUploadSlot(doc: LicenseDocKey, extension: string): Promise<UploadSlot | { error: string }> {
  const ext = extension.toLowerCase().replace(/^\./, "");
  if (!(doc in LICENSE_DOCS) || !ALLOWED_DOC_EXTENSIONS.includes(ext)) {
    return { error: "Upload a PDF or a photo (JPG, PNG, HEIC)." };
  }

  const path = `requests/${crypto.randomUUID()}/${doc === "mj_license_path" ? "mj" : "biz"}-license.${ext}`;
  const { data, error } = await createServiceClient().storage.from(LICENSE_BUCKET).createSignedUploadUrl(path);

  if (error || !data) return { error: "Couldn’t start the upload. Try again." };
  return { path: data.path, token: data.token };
}

export async function createMenuUploadSlot(extension: string): Promise<UploadSlot | { error: string }> {
  const ext = extension.toLowerCase().replace(/^\./, "");
  if (!MENU_EXTENSIONS.includes(ext)) return { error: "Upload a spreadsheet (Excel or CSV), a PDF, or a photo." };

  const path = `requests/${crypto.randomUUID()}/menu.${ext}`;
  const { data, error } = await createServiceClient().storage.from(MENU_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "Couldn’t start the upload. Try again." };
  return { path: data.path, token: data.token };
}

export type RequestState = {
  done?: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
};

export async function submitRequest(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const { data, errors } = parseAccessRequest(formData);
  if (!data) return { fieldErrors: errors, error: "Check the highlighted fields." };

  const service = createServiceClient();
  // Case-insensitive exact match; escape LIKE wildcards that can appear in emails.
  const emailPattern = data.email.replace(/[\\%_]/g, "\\$&");

  const [{ data: existingProfile }, { data: pending }] = await Promise.all([
    service.from("profiles").select("id").ilike("email", emailPattern).limit(1),
    service.from("access_requests").select("id").ilike("email", emailPattern).eq("status", "pending").limit(1),
  ]);
  if (existingProfile?.length) {
    return { fieldErrors: { email: "This email already has an account. Sign in instead." } };
  }
  if (pending?.length) {
    return { error: "We already have a pending request for this email. We’ll be in touch soon." };
  }

  // Confirm both uploads actually landed before saving paths that point at them.
  for (const key of Object.keys(LICENSE_DOCS) as LicenseDocKey[]) {
    const path = data[key];
    const folder = path.slice(0, path.lastIndexOf("/"));
    const { data: files } = await service.storage.from(LICENSE_BUCKET).list(folder);
    if (!files?.some((f) => `${folder}/${f.name}` === path)) {
      return { fieldErrors: { [key]: "Upload didn’t finish. Choose the file again." } };
    }
  }

  const { menu_path, ...request } = data;
  if (menu_path) {
    const folder = menu_path.slice(0, menu_path.lastIndexOf("/"));
    const { data: files } = await service.storage.from(MENU_BUCKET).list(folder);
    if (!files?.some((f) => `${folder}/${f.name}` === menu_path)) {
      return { fieldErrors: { menu_path: "Upload didn’t finish. Choose the file again." } };
    }
  }

  const { error } = await service.from("access_requests").insert({
    ...request,
    ...(menu_path && { menu_path }),
    full_name: `${data.first_name} ${data.last_name}`,
    status: "pending",
  });
  if (error) return { error: "We couldn’t save your request. Try again in a moment." };

  // Best effort; the request is saved either way.
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL;
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Access request: ${data.company}`,
    html: newRequestEmail({
      name: `${data.first_name} ${data.last_name}`,
      company: data.company,
      accountType: data.account_type,
      city: data.city,
      reviewUrl: `${origin}/admin/access-requests`,
    }),
  }).catch(() => undefined);

  return { done: true };
}
