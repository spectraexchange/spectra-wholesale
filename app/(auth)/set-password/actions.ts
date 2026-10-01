"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SetPasswordState = { error?: string };

export async function setPassword(_prev: SetPasswordState, formData: FormData): Promise<SetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords don’t match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error:
        error.code === "weak_password"
          ? "That password is too easy to guess. Try a longer one."
          : "We couldn’t save your password. Try again, or ask us for a fresh invite link.",
    };
  }

  redirect("/dashboard");
}
