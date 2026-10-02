import type { Metadata } from "next";
import Link from "next/link";
import { ORDER_SELECT, OrderList, type OrderWithParties } from "@/components/orders";
import { formatMoney } from "@/lib/catalog";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Orders · Spectra Admin" };

const VIEWS = {
  open: { label: "Open", statuses: ["pending", "confirmed", "shipped"] },
  delivered: { label: "Delivered", statuses: ["delivered"] },
  cancelled: { label: "Cancelled", statuses: ["cancelled"] },
  all: { label: "All", statuses: ["pending", "confirmed", "shipped", "delivered", "cancelled"] },
} as const;
type View = keyof typeof VIEWS;

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const { view: viewParam } = await searchParams;
  const view: View = viewParam === "delivered" || viewParam === "cancelled" || viewParam === "all" ? viewParam : "open";

  const { data } = await createServiceClient().from("orders").select(ORDER_SELECT).order("created_at", { ascending: false });
  const all = (data ?? []) as OrderWithParties[];
  const inView = (v: View, o: OrderWithParties) => (VIEWS[v].statuses as readonly string[]).includes(o.status);
  const orders = all.filter((o) => inView(view, o));
  const total = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.subtotal), 0);

  return (
    <>
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">Spectra admin</p>
      <h1 className="mt-2 font-display text-5xl font-light tracking-tight">Orders</h1>

      <nav className="mt-10 flex items-baseline gap-6 border-b border-ink" aria-label="Order views">
        {(Object.keys(VIEWS) as View[]).map((key) => (
          <Link
            key={key}
            href={key === "open" ? "/admin/orders" : `/admin/orders?view=${key}`}
            aria-current={view === key ? "page" : undefined}
            className={`-mb-px flex items-baseline gap-2 border-b-2 pb-3 text-[15px] transition-colors ${
              view === key ? "border-sunset text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {VIEWS[key].label}
            <span className="font-mono text-xs text-ink-soft">{all.filter((o) => inView(key, o)).length}</span>
          </Link>
        ))}
        {view !== "cancelled" && orders.length > 0 && (
          <span className="ml-auto pb-3 font-mono text-[13px] text-ink-soft">{formatMoney(total)}</span>
        )}
      </nav>

      <OrderList orders={orders} hrefBase="/admin/orders" counterparty="both" empty="No orders here." />
    </>
  );
}
