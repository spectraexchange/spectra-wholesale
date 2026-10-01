"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ForgotState = { sent?: boolean; error?: string };

export async function requestReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter the email you sign in with." };

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  // Only surface rate limiting; otherwise always report success so we don't reveal which emails exist.
  if (error?.code === "over_email_send_rate_limit") {
    return { error: "Too many requests. Wait a minute and try again." };
  }
  return { sent: true };
}
