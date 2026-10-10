import { AppShell } from "@/components/app-shell";
import { requireSuperAdmin } from "@/lib/auth";
import { daysAgo } from "@/lib/error-log";
import { createServiceClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireSuperAdmin();
  const service = createServiceClient();
  const [{ count: pending }, { count: openTickets }, { data: openErrors }] = await Promise.all([
    service.from("access_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    service.from("tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
    // Distinct unresolved errors from the last week; fingerprints are counted below
    service
      .from("site_errors")
      .select("fingerprint")
      .is("resolved_at", null)
      .gte("created_at", daysAgo(7))
      .limit(1000),
  ]);
  const errorCount = new Set((openErrors ?? []).map((e) => e.fingerprint)).size;

  const nav = [
    { href: "/admin", label: "Overview", exact: true },
    { href: "/admin/access-requests", label: "Requests", count: pending ?? 0, alert: true },
    { href: "/admin/companies", label: "Companies" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/billing", label: "Billing" },
    { href: "/admin/support", label: "Support", count: openTickets ?? 0, alert: true },
    { href: "/admin/errors", label: "Errors", count: errorCount, alert: true },
    { href: "/admin/tools", label: "Tools" },
  ];

  return (
    <AppShell nav={nav} home="/admin" context="Spectra admin" userName={viewer.fullName}>
      {children}
    </AppShell>
  );
}
