import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney } from "@/lib/catalog";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Companies · Spectra Admin" };

const VIEWS = {
  all: "All",
  buyer: "Buyers",
  seller: "Vendors",
  paused: "Paused",
} as const;
type View = keyof typeof VIEWS;

export default async function AdminCompaniesPage({ searchParams }: PageProps<"/admin/companies">) {
  // Checked here, not just in the layout: layouts don't stop a page from rendering.
  await requireSuperAdmin();
  const params = await searchParams;
  const view: View = params.type === "buyer" || params.type === "seller" || params.type === "paused" ? params.type : "all";
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";

  const service = createServiceClient();
  const [{ data: companies }, { data: profiles }, { data: products }, { data: orders }] = await Promise.all([
    service.from("companies").select("id, name, type, city, license_number, is_active, created_at").order("name"),
    service.from("profiles").select("company_id"),
    service.from("products").select("seller_company_id").eq("is_archived", false),
    service.from("orders").select("buyer_company_id, seller_company_id, total, status"),
  ]);

  const tally = (rows: { [k: string]: unknown }[] | null, key: string) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r[key] as string, (m.get(r[key] as string) ?? 0) + 1);
    return m;
  };
  const users = tally(profiles, "company_id");
  const listed = tally(products, "seller_company_id");
  const volume = new Map<string, { count: number; total: number }>();
  for (const o of orders ?? []) {
    if (o.status === "cancelled") continue;
    for (const id of [o.buyer_company_id, o.seller_company_id]) {
      const v = volume.get(id) ?? { count: 0, total: 0 };
      volume.set(id, { count: v.count + 1, total: v.total + Number(o.total) });
    }
  }

  const all = companies ?? [];
  const counts: Record<View, number> = {
    all: all.length,
    buyer: all.filter((c) => c.type === "buyer").length,
    seller: all.filter((c) => c.type === "seller").length,
    paused: all.filter((c) => !c.is_active).length,
  };
  const rows = all.filter(
    (c) =>
      (view === "all" || (view === "paused" ? !c.is_active : c.type === view)) &&
      (!q || `${c.name} ${c.city ?? ""} ${c.license_number ?? ""}`.toLowerCase().includes(q)),
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">Spectra admin</p>
          <h1 className="mt-2 font-display text-5xl font-light tracking-tight">Companies</h1>
        </div>
        <form action="/admin/companies" className="flex w-full gap-2 sm:w-auto">
          {view !== "all" && <input type="hidden" name="type" value={view} />}
          <label htmlFor="q" className="sr-only">
            Search companies
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name, city or license #"
            className="w-full rounded-[3px] border border-line bg-field px-3.5 py-2.5 text-[15px] placeholder:text-ink-soft/60 focus:border-sunset focus:outline-none sm:w-72"
          />
        </form>
      </div>

      <nav className="mt-10 flex gap-6 border-b border-ink" aria-label="Company types">
        {(Object.keys(VIEWS) as View[]).map((key) => (
          <Link
            key={key}
            href={key === "all" ? "/admin/companies" : `/admin/companies?type=${key}`}
            aria-current={view === key ? "page" : undefined}
            className={`-mb-px flex items-baseline gap-2 border-b-2 pb-3 text-[15px] transition-colors ${
              view === key ? "border-sunset text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {VIEWS[key]}
            <span className="font-mono text-xs text-ink-soft">{counts[key]}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="py-14 text-ink-soft">{q ? `Nothing matches “${q}”.` : "No companies here yet."}</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((c) => {
            const v = volume.get(c.id);
            return (
              <li key={c.id}>
                <Link
                  href={`/admin/companies/${c.id}`}
                  className="group grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1 py-5 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_9rem]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-display text-lg group-hover:text-sunset">
                      {c.name}
                      {!c.is_active && <span className="ml-2 font-mono text-[10px] tracking-[0.14em] text-danger uppercase">Paused</span>}
                    </span>
                    <span className="block text-[13px] text-ink-soft">
                      {c.type === "seller" ? "Vendor" : "Buyer"}
                      {c.city && <> &middot; {c.city}</>}
                      {c.license_number && <span className="font-mono"> &middot; #{c.license_number}</span>}
                    </span>
                  </span>
                  <span className="hidden text-right text-[13px] text-ink-soft sm:block">
                    {users.get(c.id) ?? 0} {users.get(c.id) === 1 ? "user" : "users"}
                  </span>
                  <span className="hidden text-right text-[13px] text-ink-soft sm:block">
                    {c.type === "seller" ? `${listed.get(c.id) ?? 0} ${listed.get(c.id) === 1 ? "product" : "products"}` : "—"}
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-[15px]">{formatMoney(v?.total ?? 0)}</span>
                    <span className="block text-[12px] text-ink-soft">
                      {v?.count ?? 0} {v?.count === 1 ? "order" : "orders"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
