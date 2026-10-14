"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FieldError, Label } from "@/components/form";
import { VendorLogo } from "@/components/vendor-logo";
import { createClient } from "@/lib/supabase/client";
import { createLogoUpload, saveLogo } from "./logo-actions";

const MAX_BYTES = 4 * 1024 * 1024;

// Saves the moment a file is chosen; there's no separate Save button.
export function LogoForm({ companyName, logoUrl: initial }: { companyName: string; logoUrl: string }) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState(initial);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [removing, startRemove] = useTransition();

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) return setError("That image is over 4 MB.");
    setError(undefined);
    setSaved(undefined);
    setBusy(true);
    try {
      const slot = await createLogoUpload(file.name.split(".").pop() ?? "");
      if ("error" in slot) return setError(slot.error);
      const { error: uploadError } = await createClient()
        .storage.from(slot.bucket)
        .uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type || undefined });
      if (uploadError) return setError("Upload failed. Try again.");
      const result = await saveLogo(slot.publicUrl);
      if (result.error) return setError(result.error);
      setLogoUrl(slot.publicUrl);
      setSaved("Logo saved. Buyers see it on your storefront and orders.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    setError(undefined);
    startRemove(async () => {
      const result = await saveLogo(null);
      if (result.error) return setError(result.error);
      setLogoUrl("");
      setSaved("Logo removed.");
      router.refresh();
    });
  }

  return (
    <div className="grid items-start gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
      <VendorLogo name={companyName} logoUrl={logoUrl} size="lg" />
      <div>
        <Label htmlFor="logo-file">{logoUrl ? "Replace logo" : "Upload your logo"}</Label>
        <label
          className={`mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-[3px] border border-dashed px-3.5 py-3 text-[14px] transition-colors hover:border-sunset has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-sunset ${
            error ? "border-danger" : "border-ink-soft/40 bg-field"
          }`}
        >
          <input
            id="logo-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy || removing}
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <span className="text-ink-soft">{busy ? "Uploading…" : "Square works best · JPG, PNG or WebP, up to 4 MB"}</span>
          <span className="font-mono text-[11px] tracking-[0.12em] text-sunset uppercase">Browse</span>
        </label>
        <FieldError id="logo-error" error={error} />
        {saved && <p className="mt-1.5 text-[13px] text-success">{saved}</p>}
        {logoUrl && (
          <button
            type="button"
            onClick={remove}
            disabled={busy || removing}
            className="mt-2 cursor-pointer text-[13px] text-ink-soft hover:text-danger disabled:cursor-wait"
          >
            {removing ? "Removing…" : "Remove logo"}
          </button>
        )}
      </div>
    </div>
  );
}
