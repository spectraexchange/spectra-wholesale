import { AppShell } from "@/components/app-shell";
import { requireBuyer } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireBuyer();
  const { data: cart } = await createServiceClient()
    .from("cart_items")
    .select("quantity")
    .eq("buyer_profile_id", viewer.id);

  const nav = [
    { href: "/buyer/browse", label: "Browse" },
    { href: "/buyer/cart", label: "Cart", count: cart?.length ?? 0 },
    { href: "/buyer/orders", label: "Orders" },
    { href: "/buyer/account", label: "Account" },
  ];

  return (
    <AppShell nav={nav} home="/buyer/browse" context={viewer.company.name} userName={viewer.fullName}>
      {children}
    </AppShell>
  );
}
