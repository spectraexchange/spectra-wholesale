"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { error?: string; email?: string };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const message =
      error.code === "invalid_credentials"
        ? "That email and password don’t match our records."
        : error.code === "email_not_confirmed"
          ? "Your email hasn’t been confirmed yet. Check your inbox for the invite link."
          : "We couldn’t sign you in right now. Try again in a moment.";
    return { error: message, email };
  }

  redirect("/dashboard");
}
