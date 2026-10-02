import type { Metadata } from "next";
import Link from "next/link";
import { ORDER_SELECT, OrderList, type OrderWithParties } from "@/components/orders";
import { formatMoney } from "@/lib/catalog";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Overview · Spectra Admin" };

// First instant of the current month in Alaska, as an ISO timestamp.
function alaskaMonthStart() {
  const now = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Anchorage", year: "numeric", month: "2-digit", timeZoneName: "longOffset" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const offset = (parts.timeZoneName as string).replace("GMT", "") || "+00:00";
  return { iso: new Date(`${parts.year}-${parts.month}-01T00:00:00${offset}`).toISOString(), label: new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "America/Anchorage" }).format(now) };
}

export default async function AdminOverviewPage() {
  // Checked here, not just in the layout: layouts don't stop a page from rendering.
  await requireSuperAdmin();
  const service = createServiceClient();
  const month = alaskaMonthStart();

  const [requests, companies, products, monthOrders, openOrders, recent] = await Promise.all([
    service.from("access_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    service.from("companies").select("id, name, type, city, is_active, created_at").order("created_at", { ascending: false }),
    service
      .from("products")
      .select("id, vendor:companies!inner(is_active)", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("is_archived", false)
      .eq("vendor.is_active", true),
    service.from("orders").select("total, status").gte("created_at", month.iso),
    service.from("orders").select("status").in("status", ["pending", "confirmed", "shipped"]),
    service.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(8),
  ]);

  const all = companies.data ?? [];
  const buyers = all.filter((c) => c.type === "buyer" && c.is_active).length;
  const vendors = all.filter((c) => c.type === "seller" && c.is_active).length;
  const placed = (monthOrders.data ?? []).filter((o) => o.status !== "cancelled");
  const sales = placed.reduce((sum, o) => sum + Number(o.total), 0);
  const awaiting = (openOrders.data ?? []).filter((o) => o.status === "pending").length;

  const stats: { label: string; value: string; detail?: string; href: string; alert?: boolean }[] = [
    { label: "Requests waiting", value: String(requests.count ?? 0), href: "/admin/access-requests", alert: (requests.count ?? 0) > 0 },
    { label: "Buyers", value: String(buyers), href: "/admin/companies?type=buyer" },
    { label: "Vendors", value: String(vendors), detail: `${products.count ?? 0} live products`, href: "/admin/companies?type=seller" },
    { label: `Orders in ${month.label}`, value: String(placed.length), detail: formatMoney(sales), href: "/admin/orders" },
    {
      label: "Open orders",
      value: String(openOrders.data?.length ?? 0),
      detail: awaiting ? `${awaiting} awaiting vendor` : "all confirmed",
      href: "/admin/orders",
      alert: awaiting > 0,
    },
  ];

  return (
    <>
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">Spectra admin</p>
      <h1 className="mt-2 font-display text-5xl font-light tracking-tight">Overview</h1>

      <dl className="mt-10 grid grid-cols-2 border-y border-ink sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group border-line px-0 py-6 transition-colors odd:pr-4 even:border-l even:pl-5 hover:bg-paper-deep/60 sm:border-l sm:pl-5 sm:first:border-l-0 sm:first:pl-0 lg:px-5 lg:first:pl-0"
          >
            <dt className="font-mono text-[10px] tracking-[0.16em] text-ink-soft uppercase">{s.label}</dt>
            <dd className={`mt-2 font-display text-5xl font-light ${s.alert ? "text-sunset" : ""}`}>{s.value}</dd>
            {s.detail && <dd className="mt-1 text-[13px] text-ink-soft">{s.detail}</dd>}
          </Link>
        ))}
      </dl>

      <div className="mt-16 grid gap-16 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section>
          <div className="flex items-baseline justify-between border-b border-ink pb-3">
            <h2 className="font-display text-2xl">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm text-ink-soft underline decoration-line underline-offset-4 hover:text-sunset">
              All orders
            </Link>
          </div>
          <OrderList
            orders={(recent.data ?? []) as OrderWithParties[]}
            hrefBase="/admin/orders"
            counterparty="both"
            empty="No orders yet."
          />
        </section>

        <section>
          <div className="flex items-baseline justify-between border-b border-ink pb-3">
            <h2 className="font-display text-2xl">Newest companies</h2>
            <Link href="/admin/companies" className="text-sm text-ink-soft underline decoration-line underline-offset-4 hover:text-sunset">
              All
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {all.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link href={`/admin/companies/${c.id}`} className="group flex items-baseline justify-between gap-3 py-4">
                  <span className="min-w-0 truncate group-hover:text-sunset">{c.name}</span>
                  <span className="shrink-0 font-mono text-[10px] tracking-[0.14em] text-ink-soft uppercase">
                    {c.type === "seller" ? "Vendor" : "Buyer"}
                    {!c.is_active && <span className="text-danger"> &middot; paused</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
