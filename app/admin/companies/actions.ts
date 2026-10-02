"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export type AdminCompanyState = { ok?: string; error?: string; fieldErrors?: Record<string, string> };

function refresh(id: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/admin/companies/${id}`);
}

// Business name and license number are the fields only Spectra can change.
export async function updateCompanyIdentity(id: string, _prev: AdminCompanyState, formData: FormData): Promise<AdminCompanyState> {
  await requireSuperAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const license = String(formData.get("license_number") ?? "").trim().toUpperCase();

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Enter the business name.";
  else if (name.length > 120) errors.name = "Keep it under 120 characters.";
  if (!license) errors.license_number = "Enter the license number.";
  if (Object.keys(errors).length) return { fieldErrors: errors };

  const { error } = await createServiceClient().from("companies").update({ name, license_number: license }).eq("id", id);
  if (error) return { error: "Couldn’t save. Try again." };

  refresh(id);
  return { ok: "Saved." };
}

// Pausing blocks the company's users from the app and hides a vendor's catalog.
export async function setCompanyActive(id: string, active: boolean): Promise<{ ok?: string; error?: string }> {
  await requireSuperAdmin();
  const { error } = await createServiceClient().from("companies").update({ is_active: active }).eq("id", id);
  if (error) return { error: "Couldn’t update the account." };

  refresh(id);
  return { ok: active ? "Account reactivated." : "Account paused." };
}
