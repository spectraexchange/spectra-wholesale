"use client";

import { startTransition, useActionState, useState } from "react";
import { Field, FieldError, Label, Notice, SubmitButton, TextArea, useLiveErrors } from "@/components/form";
import type { AccountFormState } from "@/lib/account-actions";
import { createClient } from "@/lib/supabase/client";
import { createLogoUpload, saveInvoiceSettings } from "./invoice-actions";

const MAX_BYTES = 4 * 1024 * 1024;

export type InvoiceSettings = {
  logo_url: string;
  invoice_payable_to: string;
  invoice_terms: string;
  invoice_turnaround: string;
  invoice_payment_terms: string;
};

export function InvoiceSettingsForm({ settings }: { settings: InvoiceSettings }) {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(saveInvoiceSettings, {});
  const { errors, markEdited } = useLiveErrors(state.fieldErrors);
  const [logoUrl, setLogoUrl] = useState(settings.logo_url);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) return setUploadError("That image is over 4 MB.");
    setUploadError(undefined);
    setUploading(true);
    try {
      const slot = await createLogoUpload(file.name.split(".").pop() ?? "");
      if ("error" in slot) return setUploadError(slot.error);
      const { error } = await createClient()
        .storage.from(slot.bucket)
        .uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type || undefined });
      if (error) return setUploadError("Upload failed. Try again.");
      setLogoUrl(slot.publicUrl);
      markEdited("logo_url");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      noValidate
      onChange={markEdited}
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="space-y-6"
    >
      {state.ok && <Notice tone="success">{state.ok}</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <input type="hidden" name="logo_url" value={logoUrl} />

      <div className="grid items-start gap-5 sm:grid-cols-[9rem_minmax(0,1fr)]">
        <div className="flex aspect-square items-center justify-center rounded-[3px] border border-line bg-field p-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary dimensions
            <img src={logoUrl} alt="Your logo" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="font-mono text-[10px] tracking-[0.14em] text-ink-soft uppercase">No logo</span>
          )}
        </div>
        <div>
          <Label htmlFor="logo-file">{logoUrl ? "Replace logo" : "Brand logo"}</Label>
          <label
            className={`mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-[3px] border border-dashed px-3.5 py-3 text-[14px] transition-colors hover:border-sunset has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-sunset ${
              uploadError || errors.logo_url ? "border-danger" : "border-ink-soft/40 bg-field"
            }`}
          >
            <input
              id="logo-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <span className="text-ink-soft">{uploading ? "Uploading…" : "JPG, PNG or WebP, up to 4 MB"}</span>
            <span className="font-mono text-[11px] tracking-[0.12em] text-sunset uppercase">Browse</span>
          </label>
          <FieldError id="logo-error" error={uploadError ?? errors.logo_url} />
          {logoUrl && (
            <button type="button" onClick={() => setLogoUrl("")} className="mt-2 cursor-pointer text-[13px] text-ink-soft hover:text-danger">
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <Field
          label="Turnaround"
          name="invoice_turnaround"
          defaultValue={settings.invoice_turnaround}
          placeholder="1–2 days Mat-Su · Anchorage Tue–Wed"
          error={errors.invoice_turnaround}
        />
        <Field
          label="Payment terms"
          name="invoice_payment_terms"
          defaultValue={settings.invoice_payment_terms}
          placeholder="COD"
          error={errors.invoice_payment_terms}
        />
      </div>
      <TextArea
        label="How to pay you"
        name="invoice_payable_to"
        rows={3}
        defaultValue={settings.invoice_payable_to}
        placeholder="Checks payable to Northern Lights Cultivation LLC. Cash on delivery preferred."
        error={errors.invoice_payable_to}
      />
      <TextArea
        label="Delivery terms & order limits"
        name="invoice_terms"
        rows={4}
        defaultValue={settings.invoice_terms}
        placeholder={"Free delivery in Wasilla/Palmer\nAnchorage: $1,000 minimum\nOrders under $5k arrange their own transport"}
        hint={<span className="text-xs text-ink-soft">One per line</span>}
        error={errors.invoice_terms}
      />

      <div className="max-w-56">
        <SubmitButton pending={pending || uploading} pendingLabel={uploading ? "Uploading…" : "Saving…"}>
          Save invoice settings
        </SubmitButton>
      </div>
    </form>
  );
}
