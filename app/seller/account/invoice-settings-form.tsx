"use client";

import { startTransition, useActionState } from "react";
import { Field, Notice, SubmitButton, TextArea, useLiveErrors } from "@/components/form";
import type { AccountFormState } from "@/lib/account-actions";
import { saveInvoiceSettings } from "./invoice-actions";

export type InvoiceSettings = {
  invoice_payable_to: string;
  invoice_terms: string;
  invoice_turnaround: string;
  invoice_payment_terms: string;
};

export function InvoiceSettingsForm({ settings }: { settings: InvoiceSettings }) {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(saveInvoiceSettings, {});
  const { errors, markEdited } = useLiveErrors(state.fieldErrors);

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
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Save invoice settings
        </SubmitButton>
      </div>
    </form>
  );
}
