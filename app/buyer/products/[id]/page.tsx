import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CONTAINER_TYPES, categoryLabel, formatMoney, formatQty, strainLabel, subCategoryLabel, unitLabel } from "@/lib/catalog";
import { AddToCart } from "../../add-to-cart";
import { catalogQuery, toCatalogProduct } from "../../catalog";
import { requireBuyer } from "@/lib/auth";

export const metadata: Metadata = { title: "Product · Spectra Wholesale" };

export default async function BuyerProductPage({ params }: PageProps<"/buyer/products/[id]">) {
  // Checked here, not just in the layout: layouts don't stop a page from rendering.
  await requireBuyer();
  const { id } = await params;
  const { data } = await catalogQuery().eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = toCatalogProduct(data);

  const facts: [string, React.ReactNode][] = [
    ["Category", [categoryLabel(p.category), subCategoryLabel(p.category, p.sub_category)].filter(Boolean).join(" · ")],
    ["Strain", p.strain_type !== "na" ? strainLabel(p.strain_type) : null],
    ["THC", p.thc_percentage !== null ? `${p.thc_percentage}%` : null],
    ["Available", p.stock_qty > 0 ? formatQty(p.stock_qty, p.unit) : "Out of stock"],
    ["Minimum order", p.min_order_qty && p.min_order_qty > 1 ? String(p.min_order_qty) : null],
    ["Container", p.container_type !== "none" ? CONTAINER_TYPES.find((c) => c.value === p.container_type)?.label : null],
    ["SKU", p.sku ? <span className="font-mono">{p.sku}</span> : null],
  ];

  return (
    <>
      <Link href="/buyer/browse" className="text-sm text-ink-soft hover:text-sunset">
        &larr; Browse
      </Link>

      <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- vendor-uploaded, arbitrary dimensions
          <img src={p.image_url} alt={p.name} className="aspect-square w-full rounded-[3px] border border-line object-cover" />
        ) : (
          <div className="grid aspect-square w-full place-items-center rounded-[3px] border border-dashed border-line bg-paper-deep font-mono text-xs tracking-[0.14em] text-ink-soft uppercase">
            No photo
          </div>
        )}

        <div>
          <Link
            href={`/buyer/browse?vendor=${p.vendor.id}`}
            className="font-mono text-[11px] tracking-[0.18em] text-ink-soft uppercase hover:text-sunset"
          >
            {p.vendor.name}
            {p.vendor.city && <> &middot; {p.vendor.city}</>}
          </Link>
          <h1 className="mt-2 font-display text-4xl leading-tight font-light tracking-tight sm:text-5xl">{p.name}</h1>

          <p className="mt-6">
            <span className="font-mono text-3xl">{formatMoney(p.price_per_unit)}</span>
            <span className="text-ink-soft"> per {unitLabel(p.unit)}</span>
          </p>

          <div className="mt-6 max-w-sm">
            <AddToCart productId={p.id} minQty={p.min_order_qty ?? 1} stock={p.stock_qty} unit={unitLabel(p.unit)} size="lg" />
          </div>

          {p.description && <p className="mt-6 max-w-prose leading-relaxed whitespace-pre-line">{p.description}</p>}

          <dl className="mt-8 divide-y divide-line border-y border-line">
            {facts
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="grid grid-cols-[9rem_1fr] gap-4 py-3 text-[15px]">
                  <dt className="font-mono text-[11px] leading-6 tracking-[0.14em] text-ink-soft uppercase">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>

          {p.test_results_url ? (
            <a
              href={p.test_results_url}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block text-sunset underline underline-offset-4 hover:text-sunset-hover"
            >
              View test results (COA) &#8599;
            </a>
          ) : (
            <p className="mt-6 text-[14px] text-ink-soft">No test results posted yet.</p>
          )}
        </div>
      </div>
    </>
  );
}
