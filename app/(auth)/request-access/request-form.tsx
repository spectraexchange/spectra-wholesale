"use client";

import { useActionState, useRef, useState, startTransition } from "react";
import { Field, FieldError, Label, Notice, SubmitButton, TextArea } from "@/components/form";
import { LICENSE_BUCKET, LICENSE_DOCS, type LicenseDocKey } from "@/lib/access-requests";
import { createClient } from "@/lib/supabase/client";
import { createUploadSlot, submitRequest, type RequestState } from "./actions";

const MAX_BYTES = 10 * 1024 * 1024;

const ACCOUNT_TYPES = [
  { value: "buyer", title: "Buyer", detail: "Retailer or dispensary" },
  { value: "seller", title: "Vendor", detail: "Cultivator or processor" },
] as const;

export function RequestForm() {
  const [accountType, setAccountType] = useState<"buyer" | "seller">("buyer");
  const [files, setFiles] = useState<Partial<Record<LicenseDocKey, File>>>({});
  const [uploadError, setUploadError] = useState<Partial<Record<LicenseDocKey, string>>>({});
  // Each chosen File is uploaded once; retries after a validation error reuse the stored path.
  const uploaded = useRef(new Map<File, string>());

  const [state, formAction, pending] = useActionState<RequestState, FormData>(async (prev, formData) => {
    const supabase = createClient();

    for (const key of Object.keys(LICENSE_DOCS) as LicenseDocKey[]) {
      const file = files[key];
      if (!file) continue;
      let path = uploaded.current.get(file);
      if (!path) {
        const ext = file.name.split(".").pop() ?? "";
        const slot = await createUploadSlot(key, ext);
        if ("error" in slot) return { fieldErrors: { [key]: slot.error }, error: "Check the highlighted fields." };
        const { error } = await supabase.storage
          .from(LICENSE_BUCKET)
          .uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type || undefined });
        if (error) return { fieldErrors: { [key]: "Upload failed. Try again." }, error: "Check the highlighted fields." };
        path = slot.path;
        uploaded.current.set(file, path);
      }
      formData.set(key, path);
    }

    return submitRequest(prev, formData);
  }, {});

  if (state.done) {
    return (
      <div className="space-y-4">
        <Notice tone="success">Request received.</Notice>
        <p className="text-[15px] text-ink-soft">
          We review every request by hand. Once you&rsquo;re approved, you&rsquo;ll get an email with a link to set your
          password. Everything you entered here will already be on your account.
        </p>
      </div>
    );
  }

  const errors = { ...state.fieldErrors, ...uploadError };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        // Submit manually so React doesn't reset this long form after a failed attempt.
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="space-y-8"
    >
      {state.error && <Notice tone="error">{state.error}</Notice>}

      <fieldset>
        <legend className="mb-3 font-mono text-[11px] tracking-[0.16em] text-ink-soft uppercase">I&rsquo;m joining as a</legend>
        <div className="grid grid-cols-2 gap-3">
          {ACCOUNT_TYPES.map((type) => (
            <label
              key={type.value}
              className="cursor-pointer rounded-[3px] border border-line bg-field px-4 py-3 transition-colors hover:border-ink-soft/50 has-checked:border-sunset has-checked:bg-field-focus has-checked:shadow-[inset_0_0_0_1px_var(--sunset)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-sunset"
            >
              <input
                type="radio"
                name="account_type"
                value={type.value}
                checked={accountType === type.value}
                onChange={() => setAccountType(type.value)}
                className="sr-only"
              />
              <span className="block font-semibold">{type.title}</span>
              <span className="block text-[13px] text-ink-soft">{type.detail}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Section title="You">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" name="first_name" autoComplete="given-name" required error={errors.first_name} />
          <Field label="Last name" name="last_name" autoComplete="family-name" required error={errors.last_name} />
        </div>
        <Field label="Email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" error={errors.email} />
        <Field label="Phone" name="phone" type="tel" autoComplete="tel" required placeholder="(907) 555-0100" error={errors.phone} />
      </Section>

      <Section title="Business">
        <Field label="Business name" name="company" autoComplete="organization" required error={errors.company} />
        <Field label="License number" name="license_number" required placeholder="e.g. 10123" error={errors.license_number} />
        <Field label="Street address" name="address" autoComplete="street-address" required error={errors.address} />
        <div className="grid grid-cols-[1fr_7.5rem] gap-4">
          <Field label="City" name="city" autoComplete="address-level2" required placeholder="Anchorage" error={errors.city} />
          <Field label="ZIP" name="zip" autoComplete="postal-code" inputMode="numeric" required placeholder="99501" error={errors.zip} />
        </div>
      </Section>

      {accountType === "buyer" && (
        <Section title="Deliveries" note="Optional. Vendors see this on your orders.">
          <Field label="Receiving hours" name="receiving_hours" placeholder="Mon–Fri, 10am–4pm" />
          <TextArea label="Delivery instructions" name="delivery_instructions" rows={2} placeholder="Back entrance, ask for the inventory manager" />
        </Section>
      )}

      <Section title="Licenses" note="PDF or photo, up to 10 MB each. Only Spectra staff and your team can see these.">
        {(Object.entries(LICENSE_DOCS) as [LicenseDocKey, string][]).map(([key, label]) => (
          <FilePicker
            key={key}
            name={key}
            label={label}
            file={files[key]}
            error={errors[key]}
            onChange={(file) => {
              if (file && file.size > MAX_BYTES) {
                setUploadError((prev) => ({ ...prev, [key]: "That file is over 10 MB." }));
                return;
              }
              setUploadError((prev) => ({ ...prev, [key]: undefined }));
              setFiles((prev) => ({ ...prev, [key]: file ?? undefined }));
            }}
          />
        ))}
      </Section>

      <TextArea label="Anything else?" name="message" rows={2} hint={<span className="text-xs text-ink-soft">Optional</span>} />

      <SubmitButton pending={pending} pendingLabel="Sending request…">
        Request access
      </SubmitButton>
    </form>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-line pt-6">
      <div>
        <h2 className="font-display text-xl">{title}</h2>
        {note && <p className="mt-1 text-[13px] text-ink-soft">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function FilePicker({
  name,
  label,
  file,
  error,
  onChange,
}: {
  name: string;
  label: string;
  file?: File;
  error?: string;
  onChange: (file: File | null) => void;
}) {
  const id = `${name}-file`;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <label
        className={`group mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-[3px] border border-dashed px-3.5 py-3 text-[14px] transition-colors hover:border-sunset hover:bg-field-focus has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-sunset ${
          error ? "border-danger" : file ? "border-solid border-success bg-field-focus" : "border-ink-soft/40 bg-field"
        }`}
      >
        <input
          id={id}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,application/pdf,image/*"
          className="sr-only"
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <span className={`min-w-0 truncate ${file ? "text-ink" : "text-ink-soft"}`}>
          {file ? `✓  ${file.name}` : "Choose a file"}
        </span>
        <span className="shrink-0 font-mono text-[11px] tracking-[0.12em] text-sunset uppercase group-hover:underline">
          {file ? "Replace" : "Browse"}
        </span>
      </label>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}
