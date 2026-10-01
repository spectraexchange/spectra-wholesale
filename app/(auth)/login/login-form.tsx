"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Notice, SubmitButton } from "@/components/form";
import { signIn, type SignInState } from "./actions";

export function LoginForm({ notice }: { notice?: React.ReactNode }) {
  const [state, formAction] = useActionState<SignInState, FormData>(signIn, {});

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? <Notice tone="error">{state.error}</Notice> : notice}

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.email}
        placeholder="you@company.com"
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        hint={
          <Link
            href="/forgot-password"
            className="text-xs text-ink-soft underline decoration-line underline-offset-4 transition-colors hover:text-sunset hover:decoration-sunset"
          >
            Forgot password?
          </Link>
        }
      />

      <div className="pt-2">
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </div>
    </form>
  );
}
