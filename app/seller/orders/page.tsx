import type { Metadata } from "next";
import Link from "next/link";
import { ORDER_SELECT, OrderList, type OrderWithParties } from "@/components/orders";
import { requireSeller } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Orders · Spectra Wholesale" };

const VIEWS = {
  open: { label: "Open", statuses: ["pending", "confirmed", "shipped"], empty: "No open orders. New ones land here." },
  delivered: { label: "Delivered", statuses: ["delivered"], empty: "Nothing delivered yet." },
  cancelled: { label: "Cancelled", statuses: ["cancelled"], empty: "Nothing cancelled." },
} as const;
type View = keyof typeof VIEWS;

export default async function SellerOrdersPage({ searchParams }: PageProps<"/seller/orders">) {
  const { company } = await requireSeller();
  const { view: viewParam } = await searchParams;
  const view: View = viewParam === "delivered" || viewParam === "cancelled" ? viewParam : "open";

  const { data } = await createServiceClient()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("seller_company_id", company.id)
    .order("created_at", { ascending: false });
  const all = (data ?? []) as OrderWithParties[];
  const counts = Object.fromEntries(
    (Object.keys(VIEWS) as View[]).map((k) => [k, all.filter((o) => (VIEWS[k].statuses as readonly string[]).includes(o.status)).length]),
  ) as Record<View, number>;
  const newCount = all.filter((o) => o.status === "pending").length;

  return (
    <>
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">
        Sales{newCount > 0 && <span className="text-pending"> &middot; {newCount} waiting for confirmation</span>}
      </p>
      <h1 className="mt-2 font-display text-5xl font-light tracking-tight">Orders</h1>

      <nav className="mt-10 flex gap-6 border-b border-ink" aria-label="Order views">
        {(Object.keys(VIEWS) as View[]).map((key) => (
          <Link
            key={key}
            href={key === "open" ? "/seller/orders" : `/seller/orders?view=${key}`}
            aria-current={view === key ? "page" : undefined}
            className={`-mb-px flex items-baseline gap-2 border-b-2 pb-3 text-[15px] transition-colors ${
              view === key ? "border-sunset text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {VIEWS[key].label}
            <span className="font-mono text-xs text-ink-soft">{counts[key]}</span>
          </Link>
        ))}
      </nav>

      <OrderList
        orders={all.filter((o) => (VIEWS[view].statuses as readonly string[]).includes(o.status))}
        hrefBase="/seller/orders"
        counterparty="buyer"
        empty={VIEWS[view].empty}
      />
    </>
  );
}
