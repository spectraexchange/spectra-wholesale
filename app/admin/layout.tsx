import { AppShell } from "@/components/app-shell";
import { requireSuperAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireSuperAdmin();
  const { count: pending } = await createServiceClient()
    .from("access_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const nav = [
    { href: "/admin", label: "Overview", exact: true },
    { href: "/admin/access-requests", label: "Requests", count: pending ?? 0 },
    { href: "/admin/companies", label: "Companies" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/billing", label: "Billing" },
    { href: "/admin/tools", label: "Tools" },
  ];

  return (
    <AppShell nav={nav} home="/admin" context="Spectra admin" userName={viewer.fullName}>
      {children}
    </AppShell>
  );
}
