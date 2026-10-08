"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FieldError } from "@/components/form";
import { LICENSE_BUCKET, docContentType, type LicenseDocKey } from "@/lib/access-requests";
import { createLicenseUpload, saveLicense } from "@/lib/license-actions";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 10 * 1024 * 1024;

export type LicenseDoc = { key: LicenseDocKey; label: string; href: string | null };

// Renewed licenses go straight to private storage via a signed link, then the
// company's record points at the new file.
export function LicenseDocs({ docs }: { docs: LicenseDoc[] }) {
  return docs.map((doc) => <LicenseDocRow key={doc.key} doc={doc} />);
}

function LicenseDocRow({ doc }: { doc: LicenseDoc }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const inputId = `${doc.key}-file`;

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) return setError("That file is over 10 MB.");
    setError(undefined);
    setSaved(false);
    setUploading(true);
    try {
      const slot = await createLicenseUpload(doc.key, file.name.split(".").pop() ?? "");
      if ("error" in slot) return setError(slot.error);
      const { error: uploadError } = await createClient()
        .storage.from(LICENSE_BUCKET)
        .uploadToSignedUrl(slot.path, slot.token, file, { contentType: docContentType(file) });
      if (uploadError) return setError("Upload failed. Try again.");
      const result = await saveLicense(doc.key, slot.path);
      if (result.error) return setError(result.error);
      setSaved(true);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 py-3 text-[14px]">
      <dt className="font-mono text-[11px] leading-6 tracking-[0.14em] text-ink-soft uppercase">{doc.label}</dt>
      <dd>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {doc.href ? (
            <a href={doc.href} target="_blank" rel="noreferrer" className="text-sunset underline underline-offset-4 hover:text-sunset-hover">
              View &#8599;
            </a>
          ) : (
            <span className="text-ink-soft">Not on file</span>
          )}
          <label
            htmlFor={inputId}
            className={`cursor-pointer text-ink-soft underline decoration-line underline-offset-4 hover:text-sunset has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-sunset ${
              uploading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {uploading ? "Uploading…" : doc.href ? "Replace" : "Upload"}
            <input
              id={inputId}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,application/pdf,image/*"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {saved && <p className="mt-1.5 text-[13px] text-success">Updated. Spectra will review it.</p>}
        <FieldError id={`${doc.key}-error`} error={error} />
      </dd>
    </div>
  );
}
