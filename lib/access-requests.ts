// Shared shape + validation for access requests. Every field here has a home on
// `companies` or `profiles`, and approval copies all of them across (see
// app/admin/access-requests/actions.ts) so nothing has to be re-entered.

export const LICENSE_BUCKET = "license-documents";

export const LICENSE_DOCS = {
  mj_license_path: "Marijuana establishment license",
  biz_license_path: "Alaska business license",
} as const;
export type LicenseDocKey = keyof typeof LICENSE_DOCS;

export const ALLOWED_DOC_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "heic", "webp"];

// Some phones send HEIC photos with no MIME type, which the bucket rejects; fall back to the extension.
const DOC_TYPES: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", heic: "image/heic", webp: "image/webp" };
export function docContentType(file: File) {
  return file.type || DOC_TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""] || undefined;
}

export type AccessRequestInput = {
  account_type: "buyer" | "seller";
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  license_number: string;
  address: string;
  city: string;
  zip: string;
  receiving_hours: string | null;
  delivery_instructions: string | null;
  mj_license_path: string;
  biz_license_path: string;
  message: string | null;
};

export type FieldErrors = Partial<Record<keyof AccessRequestInput, string>>;

// requests/<uuid>/<doc>.<ext>, as issued by createUploadSlots
const DOC_PATH = /^requests\/[0-9a-f-]{36}\/(mj|biz)-license\.[a-z]+$/;

export function parseAccessRequest(formData: FormData): { data?: AccessRequestInput; errors: FieldErrors } {
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const optional = (key: string) => text(key) || null;
  const errors: FieldErrors = {};

  const accountType = text("account_type");
  const data: AccessRequestInput = {
    account_type: accountType === "seller" ? "seller" : "buyer",
    first_name: text("first_name"),
    last_name: text("last_name"),
    email: text("email").toLowerCase(),
    phone: text("phone"),
    company: text("company"),
    license_number: text("license_number").toUpperCase(),
    address: text("address"),
    city: text("city"),
    zip: text("zip"),
    receiving_hours: accountType === "buyer" ? optional("receiving_hours") : null,
    delivery_instructions: accountType === "buyer" ? optional("delivery_instructions") : null,
    mj_license_path: text("mj_license_path"),
    biz_license_path: text("biz_license_path"),
    message: optional("message"),
  };

  if (accountType !== "buyer" && accountType !== "seller") errors.account_type = "Choose buyer or vendor.";

  const required: [keyof AccessRequestInput, string][] = [
    ["first_name", "Enter your first name."],
    ["last_name", "Enter your last name."],
    ["email", "Enter your email."],
    ["phone", "Enter a phone number."],
    ["company", "Enter your business name."],
    ["license_number", "Enter your license number."],
    ["address", "Enter your street address."],
    ["city", "Enter your city."],
    ["zip", "Enter your ZIP code."],
  ];
  for (const [key, message] of required) if (!data[key]) errors[key] = message;

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "That email doesn’t look right.";
  if (data.phone && data.phone.replace(/\D/g, "").length < 10) errors.phone = "Include the area code.";
  if (data.zip && !/^\d{5}(-\d{4})?$/.test(data.zip)) errors.zip = "Use a 5-digit ZIP.";
  else if (data.zip && !/^99[5-9]/.test(data.zip)) errors.zip = "Spectra serves Alaska businesses only (ZIPs 995–999).";

  for (const key of Object.keys(LICENSE_DOCS) as LicenseDocKey[]) {
    if (!data[key]) errors[key] = "Upload this document.";
    else if (!DOC_PATH.test(data[key])) errors[key] = "Upload failed. Choose the file again.";
  }

  return Object.keys(errors).length ? { errors } : { data, errors };
}

export function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : phone;
}
