import { AppShell } from "@/components/app-shell";
import { requireSuperAdmin } from "@/lib/auth";

const NAV = [{ href: "/admin/access-requests", label: "Access requests" }];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireSuperAdmin();

  return (
    <AppShell nav={NAV} home="/admin/access-requests" context="Spectra admin" userName={viewer.fullName}>
      {children}
    </AppShell>
  );
}
