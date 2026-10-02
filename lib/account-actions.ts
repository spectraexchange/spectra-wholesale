"use server";

import { revalidatePath } from "next/cache";
import { formatPhone } from "@/lib/access-requests";
import { getViewer } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type AccountFormState = { ok?: string; error?: string; fieldErrors?: Record<string, string> };

const ADMIN_ROLES = ["buyer_admin", "seller_admin", "super_admin"];
const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const validPhone = (phone: string) => phone.replace(/\D/g, "").length >= 10;

function refresh() {
  revalidatePath("/buyer", "layout");
  revalidatePath("/seller", "layout");
}

export async function updateProfile(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Your session ended. Sign in again." };

  const first = text(formData, "first_name");
  const last = text(formData, "last_name");
  const phone = text(formData, "phone");
  const errors: Record<string, string> = {};
  if (!first) errors.first_name = "Enter your first name.";
  if (!last) errors.last_name = "Enter your last name.";
  if (phone && !validPhone(phone)) errors.phone = "Include the area code.";
  if (Object.keys(errors).length) return { fieldErrors: errors };

  const { error } = await createServiceClient()
    .from("profiles")
    .update({ first_name: first, last_name: last, full_name: `${first} ${last}`, phone: phone ? formatPhone(phone) : null })
    .eq("id", viewer.id);
  if (error) return { error: "Couldn’t save your profile. Try again." };

  refresh();
  return { ok: "Profile saved." };
}

export async function updateCompany(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const viewer = await getViewer();
  if (!viewer?.company) return { error: "Your session ended. Sign in again." };
  if (!ADMIN_ROLES.includes(viewer.role)) return { error: "Only your company’s admin can change these details." };
  if (!viewer.company.is_active || !viewer.company.is_approved) return { error: "This account is paused. Contact Spectra." };

  const isBuyer = viewer.company.type === "buyer";
  const patch = {
    phone: text(formData, "phone"),
    email: text(formData, "email").toLowerCase(),
    address: text(formData, "address"),
    city: text(formData, "city"),
    zip: text(formData, "zip"),
    ...(isBuyer && {
      receiving_hours: text(formData, "receiving_hours") || null,
      delivery_instructions: text(formData, "delivery_instructions") || null,
    }),
  };

  const errors: Record<string, string> = {};
  if (!validPhone(patch.phone)) errors.phone = "Include the area code.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email)) errors.email = "Enter the email orders should go to.";
  if (!patch.address) errors.address = "Enter your street address.";
  if (!patch.city) errors.city = "Enter your city.";
  if (!/^\d{5}(-\d{4})?$/.test(patch.zip)) errors.zip = "Use a 5-digit ZIP.";
  else if (!/^99[5-9]/.test(patch.zip)) errors.zip = "Alaska ZIPs only (995–999).";
  if ((patch.delivery_instructions?.length ?? 0) > 500) errors.delivery_instructions = "Keep it under 500 characters.";
  if (Object.keys(errors).length) return { fieldErrors: errors };

  const { error } = await createServiceClient()
    .from("companies")
    .update({ ...patch, phone: formatPhone(patch.phone) })
    .eq("id", viewer.company.id);
  if (error) return { error: "Couldn’t save company details. Try again." };

  refresh();
  return { ok: "Company details saved. New orders will use them." };
}

export async function changePassword(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Your session ended. Sign in again." };

  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");
  if (!current) return { fieldErrors: { current_password: "Enter your current password." } };
  if (next.length < 8) return { fieldErrors: { new_password: "Use at least 8 characters." } };
  if (next !== confirm) return { fieldErrors: { confirm_password: "Those passwords don’t match." } };

  // Re-check the current password so an unattended session can't take over the account.
  const supabase = await createClient();
  const { error: authError } = await supabase.auth.signInWithPassword({ email: viewer.email, password: current });
  if (authError) return { fieldErrors: { current_password: "That isn’t your current password." } };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "That’s already your password."
          : error.code === "weak_password"
            ? "That password is too easy to guess. Try a longer one."
            : "Couldn’t change your password. Try again.",
    };
  }
  return { ok: "Password changed." };
}
