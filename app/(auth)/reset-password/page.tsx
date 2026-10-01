"use client";

import { useActionState } from "react";
import { Field, Notice, SubmitButton } from "@/components/form";
import { updatePassword, type ResetState } from "./actions";

export default function ResetPasswordPage() {
  const [state, formAction] = useActionState<ResetState, FormData>(updatePassword, {});

  return (
    <>
      <title>Set new password · Spectra Wholesale</title>
      <h1 className="font-display text-[2.1rem] leading-tight font-normal tracking-tight">Set a new password</h1>
      <p className="mt-2 mb-8 text-[15px] text-ink-soft">Use at least 8 characters.</p>

      <form action={formAction} className="space-y-5">
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <Field label="New password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
        <div className="pt-2">
          <SubmitButton pendingLabel="Saving…">Save password</SubmitButton>
        </div>
      </form>
    </>
  );
}
