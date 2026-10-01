"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Notice, SubmitButton } from "@/components/form";
import { requestReset, type ForgotState } from "./actions";

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState<ForgotState, FormData>(requestReset, {});

  return (
    <>
      <title>Reset password · Spectra Wholesale</title>
      <h1 className="font-display text-[2.1rem] leading-tight font-normal tracking-tight">Reset password</h1>
      <p className="mt-2 mb-8 text-[15px] text-ink-soft">
        Enter your email and we&rsquo;ll send you a link to set a new password.
      </p>

      {state.sent ? (
        <Notice tone="success">
          If an account exists for that email, a reset link is on its way. It expires in one hour.
        </Notice>
      ) : (
        <form action={formAction} className="space-y-5">
          {state.error && <Notice tone="error">{state.error}</Notice>}
          <Field label="Email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
          <div className="pt-2">
            <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
          </div>
        </form>
      )}

      <div className="mt-8 border-t border-line pt-6 text-sm">
        <Link
          href="/login"
          className="text-ink-soft underline decoration-line underline-offset-4 transition-colors hover:text-sunset hover:decoration-sunset"
        >
          &larr; Back to sign in
        </Link>
      </div>
    </>
  );
}
