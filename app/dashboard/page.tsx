import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getViewer, homeFor } from "@/lib/auth";

// Post-login landing: sends each role to its home. Buyers see a placeholder
// until the buyer side is built.
export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const home = homeFor(viewer.role);
  if (home !== "/dashboard") redirect(home);

  return (
    <AppShell nav={[]} home="/dashboard" context={viewer.company?.name ?? "Buyer"} userName={viewer.fullName}>
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">{viewer.company?.name}</p>
      <h1 className="mt-2 font-display text-5xl font-light tracking-tight">Welcome, {viewer.fullName.split(" ")[0]}.</h1>
      <p className="mt-4 max-w-xl text-ink-soft">
        Your account is set up. Browsing vendor catalogs and placing orders is coming next.
      </p>
    </AppShell>
  );
}
