import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, categoryLabel, formatMoney, strainLabel, subCategoryLabel, unitLabel } from "@/lib/catalog";
import { AddToCart } from "../add-to-cart";
import { catalogQuery, toCatalogProduct, type CatalogProduct } from "../catalog";

export const metadata: Metadata = { title: "Browse · Spectra Wholesale" };

export default async function BrowsePage({ searchParams }: PageProps<"/buyer/browse">) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : "";
  const vendorId = typeof params.vendor === "string" ? params.vendor : "";
  const q = typeof params.q === "string" ? params.q.trim() : "";

  // Everything orderable, so category/vendor counts reflect the whole catalog
  const { data } = await catalogQuery().order("name");
  const all = (data ?? []).map(toCatalogProduct);

  const vendors = [...new Map(all.map((p) => [p.vendor.id, p.vendor])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const needle = q.toLowerCase();
  const products = all.filter(
    (p) =>
      (!category || p.category === category) &&
      (!vendorId || p.vendor.id === vendorId) &&
      (!needle || `${p.name} ${p.vendor.name} ${p.sku ?? ""}`.toLowerCase().includes(needle)),
  );

  const href = (next: { category?: string; vendor?: string }) => {
    const sp = new URLSearchParams();
    const c = next.category ?? category;
    const v = next.vendor ?? vendorId;
    if (c) sp.set("category", c);
    if (v) sp.set("vendor", v);
    if (q) sp.set("q", q);
    const s = sp.toString();
    return s ? `/buyer/browse?${s}` : "/buyer/browse";
  };

  const presentCategories = CATEGORIES.filter((c) => all.some((p) => p.category === c.value));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">
            {all.length} products &middot; {vendors.length} {vendors.length === 1 ? "vendor" : "vendors"}
          </p>
          <h1 className="mt-2 font-display text-5xl font-light tracking-tight">Browse</h1>
        </div>

        <form action="/buyer/browse" className="flex w-full gap-2 sm:w-auto">
          {category && <input type="hidden" name="category" value={category} />}
          <label htmlFor="q" className="sr-only">
            Search products
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search products or vendors"
            className="w-full rounded-[3px] border border-line bg-field px-3.5 py-2.5 text-[15px] placeholder:text-ink-soft/60 focus:border-sunset focus:outline-none sm:w-72"
          />
          <select
            name="vendor"
            defaultValue={vendorId}
            aria-label="Vendor"
            className="cursor-pointer rounded-[3px] border border-line bg-field px-3 py-2.5 text-[14px] focus:border-sunset focus:outline-none"
          >
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="cursor-pointer rounded-[3px] border border-ink px-4 text-[14px] font-medium transition-colors hover:bg-ink hover:text-paper"
          >
            Go
          </button>
        </form>
      </div>

      <nav className="mt-10 flex gap-6 overflow-x-auto border-b border-ink" aria-label="Categories">
        {[{ value: "", label: "All" }, ...presentCategories].map((c) => {
          const count = c.value ? all.filter((p) => p.category === c.value).length : all.length;
          const active = category === c.value;
          return (
            <Link
              key={c.value || "all"}
              href={href({ category: c.value })}
              aria-current={active ? "page" : undefined}
              className={`-mb-px flex shrink-0 items-baseline gap-2 border-b-2 pb-3 text-[15px] whitespace-nowrap transition-colors ${
                active ? "border-sunset text-ink" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {c.label}
              <span className="font-mono text-xs text-ink-soft">{count}</span>
            </Link>
          );
        })}
      </nav>

      {(q || vendorId) && (
        <p className="mt-6 text-[14px] text-ink-soft">
          {products.length} {products.length === 1 ? "result" : "results"}
          {q && <> for &ldquo;{q}&rdquo;</>}
          {vendorId && <> from {vendors.find((v) => v.id === vendorId)?.name}</>} &middot;{" "}
          <Link href={category ? `/buyer/browse?category=${category}` : "/buyer/browse"} className="underline underline-offset-4 hover:text-sunset">
            Clear
          </Link>
        </p>
      )}

      {all.length === 0 ? (
        <p className="py-16 text-ink-soft">No vendors have listed products yet. Check back soon.</p>
      ) : products.length === 0 ? (
        <p className="py-16 text-ink-soft">Nothing matches. Try another category or search.</p>
      ) : (
        <ul className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductTile key={p.id} product={p} />
          ))}
        </ul>
      )}
    </>
  );
}

function ProductTile({ product: p }: { product: CatalogProduct }) {
  const detail = [subCategoryLabel(p.category, p.sub_category) || categoryLabel(p.category), p.strain_type !== "na" && strainLabel(p.strain_type), p.thc_percentage !== null && `${p.thc_percentage}% THC`]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex flex-col">
      <Link href={`/buyer/products/${p.id}`} className="group block">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- vendor-uploaded, arbitrary dimensions
          <img src={p.image_url} alt="" className="aspect-square w-full rounded-[3px] border border-line object-cover transition-opacity group-hover:opacity-90" />
        ) : (
          <div className="grid aspect-square w-full place-items-center rounded-[3px] border border-dashed border-line bg-paper-deep font-mono text-[11px] tracking-[0.14em] text-ink-soft uppercase">
            {categoryLabel(p.category)}
          </div>
        )}
        <p className="mt-4 font-mono text-[10px] tracking-[0.16em] text-ink-soft uppercase">{p.vendor.name}</p>
        <h2 className="mt-1 font-display text-xl leading-snug group-hover:text-sunset">{p.name}</h2>
        <p className="mt-1 text-[13px] text-ink-soft">{detail}</p>
      </Link>

      <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-3">
        <p>
          <span className="font-mono text-[17px]">{formatMoney(p.price_per_unit)}</span>
          <span className="text-[13px] text-ink-soft"> / {unitLabel(p.unit)}</span>
        </p>
        <p className="text-right text-[12px] text-ink-soft">
          {p.stock_qty > 0 ? `${p.stock_qty} available` : "Out of stock"}
          {p.min_order_qty && p.min_order_qty > 1 ? <span className="block">min {p.min_order_qty}</span> : null}
        </p>
      </div>

      <div className="mt-3">
        <AddToCart productId={p.id} minQty={p.min_order_qty ?? 1} stock={p.stock_qty} unit={unitLabel(p.unit)} />
      </div>
    </li>
  );
}
