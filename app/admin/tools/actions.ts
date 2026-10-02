"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/auth";
import { INVOICE_TEMPLATES } from "@/lib/invoice-templates";
import { createServiceClient } from "@/lib/supabase/server";

export async function setInvoiceTemplate(key: string): Promise<{ ok?: string; error?: string }> {
  const admin = await requireSuperAdmin();
  const template = INVOICE_TEMPLATES.find((t) => t.key === key);
  if (!template) return { error: "That design doesn’t exist." };

  const { error } = await createServiceClient()
    .from("platform_settings")
    .upsert({ key: "invoice_template", value: key, updated_at: new Date().toISOString(), updated_by: admin.id });
  if (error) return { error: error.code === "42P01" ? "Run the invoices migration first." : "Couldn’t switch the design. Try again." };

  await audit({ adminId: admin.id, action: "invoice_template_update", details: { template: key } });
  // Every invoice page on the platform reads the setting
  revalidatePath("/", "layout");
  return { ok: `${template.name} is now live on every invoice.` };
}
