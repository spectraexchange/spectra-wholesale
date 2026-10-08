import { AppShell } from "@/components/app-shell";
import { requireSeller } from "@/lib/auth";

const NAV = [
  { href: "/seller/products", label: "Products" },
  { href: "/seller/orders", label: "Orders" },
  { href: "/seller/account", label: "Account" },
  { href: "/seller/support", label: "Support" },
];

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireSeller();

  return (
    <AppShell nav={NAV} home="/seller/products" context={viewer.company.name} userName={viewer.fullName}>
      {children}
    </AppShell>
  );
}
