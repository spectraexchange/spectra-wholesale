import { createServiceClient } from "@/lib/supabase/server";

export type AuditAction =
  | "company_update"
  | "user_update"
  | "password_reset_sent"
  | "view_as_start"
  | "view_as_end"
  | "subscription_update"
  | "payment_recorded"
  | "payment_deleted"
  | "invoice_template_update";

// Best effort: an admin action never fails because logging did.
export async function audit(entry: {
  adminId: string;
  action: AuditAction;
  companyId?: string | null;
  userId?: string | null;
  details?: Record<string, unknown>;
}) {
  await createServiceClient()
    .from("admin_audit_log")
    .insert({
      admin_id: entry.adminId,
      action: entry.action,
      company_id: entry.companyId ?? null,
      user_id: entry.userId ?? null,
      details: entry.details ?? {},
    })
    .then(() => undefined, () => undefined);
}

export const AUDIT_LABELS: Record<string, string> = {
  company_update: "Edited company details",
  user_update: "Edited a user",
  password_reset_sent: "Sent a password reset",
  view_as_start: "Started viewing as",
  view_as_end: "Stopped viewing as",
  subscription_update: "Updated subscription",
  payment_recorded: "Recorded a payment",
  payment_deleted: "Deleted a payment",
  invoice_template_update: "Switched the invoice design",
};
