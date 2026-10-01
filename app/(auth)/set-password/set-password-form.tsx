"use client";

import { useActionState } from "react";
import { Field, Notice, SubmitButton } from "@/components/form";
import { setPassword, type SetPasswordState } from "./actions";

export function SetPasswordForm() {
  const [state, formAction] = useActionState<SetPasswordState, FormData>(setPassword, {});

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="Password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
      <div className="pt-2">
        <SubmitButton pendingLabel="Setting up…">Finish setup</SubmitButton>
      </div>
    </form>
  );
}
