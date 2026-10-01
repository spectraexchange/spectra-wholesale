"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ResetState = { error?: string };

export async function updatePassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords don’t match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "That’s your current password. Choose a new one."
          : error.code === "weak_password"
            ? "That password is too easy to guess. Try a longer one."
            : "We couldn’t update your password. Request a new reset link and try again.",
    };
  }

  await supabase.auth.signOut();
  redirect("/login?message=password-updated");
}
