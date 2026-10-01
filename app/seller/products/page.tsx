import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/form";
import { requireSeller } from "@/lib/auth";
import { categoryLabel, formatMoney, strainLabel, subCategoryLabel, unitLabel, type Product } from "@/lib/catalog";
import { createServiceClient } from "@/lib/supabase/server";
import { ProductRowActions } from "./row-actions";

export const metadata: Metadata = { title: "Products · Spectra Wholesale" };

const VIEWS = {
  active: { label: "Active", empty: "No products yet. Add your first one to start selling." },
  hidden: { label: "Hidden", empty: "Nothing hidden. Products you hide from buyers show up here." },
  archived: { label: "Archived", empty: "Nothing archived." },
} as const;
type View = keyof typeof VIEWS;

export default async function ProductsPage({ searchParams }: PageProps<"/seller/products">) {
  const { company } = await requireSeller();
  const params = await searchParams;
  const view: View = params.view === "hidden" || params.view === "archived" ? params.view : "active";
  const saved = typeof params.saved === "string" ? params.saved : null;

  const { data } = await createServiceClient()
    .from("products")
    .select("*")
    .eq("seller_company_id", company.id)
    .order("category")
    .order("name");
  const all = (data ?? []) as Product[];

  const groups: Record<View, Product[]> = {
    active: all.filter((p) => !p.is_archived && p.is_active),
    hidden: all.filter((p) => !p.is_archived && !p.is_active),
    archived: all.filter((p) => p.is_archived),
  };
  const products = groups[view];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">Catalog</p>
          <h1 className="mt-2 font-display text-5xl font-light tracking-tight">Products</h1>
        </div>
        <Link
          href="/seller/products/new"
          className="group inline-flex items-center gap-2 rounded-[3px] bg-sunset px-5 py-3 text-[15px] font-semibold text-on-sunset shadow-[3px_3px_0_0_var(--press)] transition-[background-color,transform,box-shadow] duration-100 hover:bg-sunset-hover active:translate-x-[3px] active:translate-y-[3px] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sunset"
        >
          Add product
          <span aria-hidden className="transition-transform duration-150 group-hover:translate-x-1">
            +
          </span>
        </Link>
      </div>

      {saved && (
        <div className="mt-8">
          <Notice tone="success">Saved &ldquo;{saved}&rdquo;.</Notice>
        </div>
      )}

      <nav className="mt-10 flex gap-6 border-b border-ink" aria-label="Product views">
        {(Object.keys(VIEWS) as View[]).map((key) => (
          <Link
            key={key}
            href={key === "active" ? "/seller/products" : `/seller/products?view=${key}`}
            aria-current={view === key ? "page" : undefined}
            className={`-mb-px flex items-baseline gap-2 border-b-2 pb-3 text-[15px] transition-colors ${
              view === key ? "border-sunset text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {VIEWS[key].label}
            <span className="font-mono text-xs text-ink-soft">{groups[key].length}</span>
          </Link>
        ))}
      </nav>

      {products.length === 0 ? (
        <p className="py-14 text-ink-soft">{VIEWS[view].empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {products.map((p) => (
            <li key={p.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2 py-5 sm:grid-cols-[4rem_minmax(0,1fr)_8rem_7rem_auto]">
              <Link href={`/seller/products/${p.id}`} className="block">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary dimensions
                  <img src={p.image_url} alt="" className="aspect-square w-full rounded-[3px] border border-line object-cover" />
                ) : (
                  <div className="grid aspect-square w-full place-items-center rounded-[3px] border border-dashed border-line font-mono text-[10px] text-ink-soft uppercase">
                    No photo
                  </div>
                )}
              </Link>

              <div className="min-w-0">
                <Link href={`/seller/products/${p.id}`} className="block truncate font-display text-xl hover:text-sunset">
                  {p.name}
                </Link>
                <p className="mt-0.5 truncate text-[13px] text-ink-soft">
                  {[categoryLabel(p.category), subCategoryLabel(p.category, p.sub_category), p.strain_type !== "na" && strainLabel(p.strain_type), p.thc_percentage !== null && `${p.thc_percentage}% THC`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {/* Price + stock fold under the name on small screens */}
                <p className="mt-1 text-[13px] sm:hidden">
                  {formatMoney(p.price_per_unit)} / {unitLabel(p.unit)} &middot; {p.stock_qty} in stock
                </p>
              </div>

              <div className="hidden text-right sm:block">
                <p className="font-mono text-[15px]">{formatMoney(p.price_per_unit)}</p>
                <p className="text-[12px] text-ink-soft">per {unitLabel(p.unit)}</p>
              </div>

              <div className="hidden text-right sm:block">
                <p className={`font-mono text-[15px] ${p.stock_qty === 0 ? "text-danger" : ""}`}>{p.stock_qty}</p>
                <p className="text-[12px] text-ink-soft">{p.stock_qty === 0 ? "out of stock" : "in stock"}</p>
              </div>

              <ProductRowActions id={p.id} name={p.name} view={view} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
