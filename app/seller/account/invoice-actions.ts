"use server";

import { revalidatePath } from "next/cache";
import type { AccountFormState } from "@/lib/account-actions";
import { requireSeller } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["seller_admin"];

const LIMITS = { invoice_payable_to: 600, invoice_terms: 1500, invoice_turnaround: 200, invoice_payment_terms: 40 } as const;

export async function saveInvoiceSettings(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const { company, role } = await requireSeller();
  if (!ADMIN_ROLES.includes(role)) return { error: "Only your company’s admin can change invoice settings." };

  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const patch: Record<string, string | null> = {};
  const errors: Record<string, string> = {};

  for (const [key, max] of Object.entries(LIMITS)) {
    const value = text(key);
    if (value.length > max) errors[key] = `Keep it under ${max.toLocaleString()} characters.`;
    patch[key] = value || null;
  }
  if (Object.keys(errors).length) return { fieldErrors: errors };

  const { error } = await createServiceClient().from("companies").update(patch).eq("id", company.id);
  if (error) return { error: error.code === "42703" ? "Run the invoices migration first." : "Couldn’t save invoice settings. Try again." };

  revalidatePath("/seller", "layout");
  revalidatePath("/buyer", "layout");
  return { ok: "Invoice settings saved. Every invoice, past and future, shows them." };
}
