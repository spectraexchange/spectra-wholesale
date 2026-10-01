"use client";

import { useActionState } from "react";
import { Notice, SubmitButton, TextArea } from "@/components/form";
import { placeOrder, type CheckoutState } from "./actions";

export function CheckoutForm({ sellerId, vendorName, total }: { sellerId: string; vendorName: string; total: string }) {
  const [state, formAction] = useActionState<CheckoutState, FormData>(placeOrder.bind(null, sellerId), {});

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <TextArea
        label="Notes for the vendor"
        name="notes"
        rows={3}
        maxLength={1000}
        placeholder="Preferred delivery day, substitutions, anything else"
        hint={<span className="text-xs text-ink-soft">Optional</span>}
      />
      <SubmitButton pendingLabel="Placing order…">Place order · {total}</SubmitButton>
      <p className="text-center text-[13px] text-ink-soft">
        {vendorName} confirms the order and delivery date. No payment is taken on Spectra.
      </p>
    </form>
  );
}
