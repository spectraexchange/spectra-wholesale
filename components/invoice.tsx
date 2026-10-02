import Image from "next/image";
import { categoryLabel, formatMoney, strainLabel, subCategoryLabel, unitLabel } from "@/lib/catalog";
import type { InvoiceTemplate } from "@/lib/invoice-templates";
import { ORDER_STATUSES, discountAmount, formatDeliveryDate, type Order, type OrderItem } from "@/lib/orders";

type Party = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  license_number: string | null;
};

export type InvoiceData = Order & {
  items: (OrderItem & { product: { thc_percentage: number | null; sub_category: string | null; strain_type: string | null } | null })[];
  buyer: Party & { receiving_hours: string | null };
  seller: Party & {
    logo_url: string | null;
    invoice_payable_to: string | null;
    invoice_terms: string | null;
    invoice_turnaround: string | null;
    invoice_payment_terms: string | null;
  };
};

const PARTY = "id, name, address, city, zip, phone, email, license_number";
export const INVOICE_SELECT = `*, items:order_items(*, product:products(thc_percentage, sub_category, strain_type)), buyer:companies!orders_buyer_company_id_fkey(${PARTY}, receiving_hours), seller:companies!orders_seller_company_id_fkey(${PARTY}, logo_url, invoice_payable_to, invoice_terms, invoice_turnaround, invoice_payment_terms)`;

const issued = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Anchorage" });
const paidOn = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Anchorage" });

const LABEL = "font-mono text-[10px] tracking-[0.16em] uppercase";

// One invoice layout; the active template (admin → Tools) supplies colors and header style.
// Always rendered light: it's a document people print and file.
export function Invoice({ invoice: o, template: t }: { invoice: InvoiceData; template: InvoiceTemplate }) {
  const vars = {
    "--inv-accent": t.accent,
    "--inv-band": t.band,
    "--inv-band-ink": t.bandInk,
    "--inv-tint": t.tint,
    "--inv-edge": t.edge,
  } as React.CSSProperties;

  const units = o.items.reduce((n, i) => n + i.quantity, 0);
  const discount = discountAmount(o);
  const paid = o.payment_status === "paid";
  const status = o.status === "cancelled" ? "Void" : paid ? "Paid" : ORDER_STATUSES[o.status].label;
  const band = t.header === "band";
  const terms = (o.seller.invoice_terms ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <article
      data-theme="light"
      style={vars}
      className="mx-auto max-w-[56rem] rounded-md border border-line bg-paper text-[13px] text-ink shadow-[8px_8px_0_0_var(--inv-edge)] [print-color-adjust:exact] print:max-w-none print:bg-transparent print:rounded-none print:border-0 print:shadow-none"
    >
      {/* ── Header: vendor brand left, invoice facts right ── */}
      <header
        className={`grid gap-8 px-8 pt-8 pb-7 print:gap-4 print:px-6 print:pt-5 print:pb-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-10 ${
          band ? "rounded-t-md bg-(--inv-band) text-(--inv-band-ink) print:rounded-none" : "border-b-[5px] border-(--inv-accent)"
        }`}
      >
        <div className="flex items-start gap-5">
          {o.seller.logo_url && (
            <div className={`flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[3px] ${band ? "bg-white/95 p-1.5" : "border border-line bg-white p-1.5"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- vendor-uploaded, arbitrary dimensions */}
              <img src={o.seller.logo_url} alt={`${o.seller.name} logo`} className="max-h-full max-w-full object-contain" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-display text-2xl leading-tight">{o.seller.name}</p>
            <p className={`mt-1.5 leading-relaxed ${band ? "opacity-80" : "text-ink-soft"}`}>
              {o.seller.address && <span className="block">{o.seller.address}</span>}
              {(o.seller.city || o.seller.zip) && <span className="block">{[o.seller.city && `${o.seller.city}, AK`, o.seller.zip].filter(Boolean).join(" ")}</span>}
              {o.seller.phone && <span className="block">{o.seller.phone}</span>}
              {o.seller.email && <span className="block">{o.seller.email}</span>}
            </p>
            {o.seller.license_number && (
              <p className={`mt-2 ${LABEL} ${band ? "opacity-80" : "text-ink-soft"}`}>
                License <span className="font-semibold tracking-[0.08em]">{o.seller.license_number}</span>
              </p>
            )}
          </div>
        </div>

        <div className="sm:text-right">
          <p className={`font-display text-5xl font-light tracking-tight ${band ? "" : "text-(--inv-accent)"}`}>Invoice</p>
          <p className="mt-1 font-mono text-[15px]">{o.order_number}</p>
          <dl className="mt-4 grid grid-cols-3 gap-x-6 gap-y-1 sm:justify-end">
            <Fact label="Issued" band={band}>{issued.format(new Date(o.created_at))}</Fact>
            <Fact label="Delivery" band={band}>{o.delivery_date ? formatDeliveryDate(o.delivery_date) : "TBD"}</Fact>
            <Fact label="Status" band={band}>{status}</Fact>
          </dl>
        </div>
      </header>

      <div className="px-8 sm:px-10 print:px-6">
        {/* ── Buyer + terms ── */}
        <section className="grid gap-8 border-b border-line py-7 print:gap-4 print:py-4 sm:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="min-w-0 border-l-[3px] border-(--inv-accent) pl-4">
            <p className={`${LABEL} text-(--inv-accent)`}>Bill &amp; deliver to</p>
            <p className="mt-2 font-display text-xl leading-tight">{o.buyer.name}</p>
            <p className="mt-1.5 leading-relaxed break-words text-ink-soft">
              {o.buyer.address && <span className="block">{o.buyer.address}</span>}
              {(o.buyer.city || o.buyer.zip) && <span className="block">{[o.buyer.city && `${o.buyer.city}, AK`, o.buyer.zip].filter(Boolean).join(" ")}</span>}
              <span className="block">{[o.buyer.phone, o.buyer.email].filter(Boolean).join(" · ")}</span>
              {o.buyer.receiving_hours && <span className="block">Receiving {o.buyer.receiving_hours}</span>}
            </p>
            {o.buyer.license_number && <p className="mt-2 font-mono text-[12px]">Lic. {o.buyer.license_number}</p>}
          </div>

          <dl className="divide-y divide-line self-start border-y border-line">
            <Term label="Payment terms">{o.seller.invoice_payment_terms || "On delivery"}</Term>
            <Term label="Turnaround">{o.seller.invoice_turnaround || "TBD"}</Term>
            <Term label="Delivers">{o.delivery_date ? formatDeliveryDate(o.delivery_date) : "To be scheduled"}</Term>
          </dl>
        </section>

        {/* ── Items ── */}
        <table className="mt-6 print:mt-3 w-full border-collapse text-left">
          <thead>
            <tr className={`${LABEL} border-b-2 border-(--inv-accent) text-ink-soft`}>
              <th className="w-8 py-2 pr-2 font-normal">#</th>
              <th className="py-2 pr-4 font-normal">Product</th>
              <th className="hidden py-2 pr-4 font-normal sm:table-cell print:table-cell">SKU · THC</th>
              <th className="py-2 pr-4 text-right font-normal">Qty</th>
              <th className="py-2 pr-4 text-right font-normal">Price</th>
              <th className="py-2 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((item, i) => {
              const p = item.product;
              const kind = [
                categoryLabel(item.product_category),
                p?.sub_category && subCategoryLabel(item.product_category, p.sub_category),
                p?.strain_type && p.strain_type !== "na" && strainLabel(p.strain_type),
              ].filter(Boolean);
              return (
                <tr key={item.id} className="border-b border-line align-top break-inside-avoid [&>td]:print:py-2">
                  <td className="py-3 pr-2 font-mono text-[11px] text-ink-soft">{String(i + 1).padStart(2, "0")}</td>
                  <td className="py-3 pr-4">
                    <p className="text-[14px] font-medium">{item.product_name}</p>
                    <p className="mt-0.5 text-[12px] text-ink-soft">{kind.join(" · ")}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-ink-soft sm:hidden print:hidden">
                      {[item.sku, p?.thc_percentage != null && `${p.thc_percentage}% THC`].filter(Boolean).join(" · ")}
                    </p>
                  </td>
                  <td className="hidden py-3 pr-4 font-mono text-[12px] sm:table-cell print:table-cell">
                    <span className="block">{item.sku ?? "—"}</span>
                    {p?.thc_percentage != null && <span className="block text-ink-soft">{p.thc_percentage}% THC</span>}
                  </td>
                  <td className="py-3 pr-4 text-right whitespace-nowrap">
                    <span className="font-mono text-[14px]">{item.quantity}</span>
                    <span className="block text-[11px] text-ink-soft">{unitLabel(item.unit)}{item.quantity === 1 || item.unit === "ml" ? "" : "s"}</span>
                  </td>
                  <td className="py-3 pr-4 text-right font-mono whitespace-nowrap">{formatMoney(item.price_per_unit)}</td>
                  <td className="py-3 text-right font-mono text-[14px] font-medium whitespace-nowrap">{formatMoney(item.line_total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── Payment instructions + totals ── */}
        <section className="grid gap-8 py-7 print:gap-4 print:py-4 break-inside-avoid sm:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="self-start">
            {o.seller.invoice_payable_to && (
              <div className="rounded-[3px] bg-(--inv-tint) px-4 py-3">
                <p className={`${LABEL} text-(--inv-accent)`}>How to pay</p>
                <p className="mt-1.5 leading-relaxed whitespace-pre-line">{o.seller.invoice_payable_to}</p>
              </div>
            )}
            {o.notes && (
              <div className="mt-5">
                <p className={`${LABEL} text-ink-soft`}>Buyer notes</p>
                <p className="mt-1.5 leading-relaxed whitespace-pre-line text-ink-soft">{o.notes}</p>
              </div>
            )}
          </div>

          <dl className="space-y-1.5">
            <Sum label="Units">{units.toLocaleString()}</Sum>
            <Sum label="Subtotal">{formatMoney(o.subtotal)}</Sum>
            {discount > 0 && <Sum label={`Discount (${Number(o.discount_percent)}%)`}>&minus;{formatMoney(discount)}</Sum>}
            {Number(o.shipping_cost) > 0 && <Sum label="Delivery">{formatMoney(o.shipping_cost)}</Sum>}
            <div className="!mt-3 flex items-baseline justify-between border-t-2 border-(--inv-accent) pt-3">
              <dt className="font-display text-lg">Total</dt>
              <dd className="font-mono text-2xl font-medium">{formatMoney(o.total)}</dd>
            </div>
            {o.status !== "cancelled" && (
              <div className="!mt-3 space-y-1.5 border-t border-line pt-3">
                {paid ? (
                  <>
                    <Sum label={`Paid${o.payment_date ? ` ${paidOn.format(new Date(o.payment_date))}` : ""}`}>&minus;{formatMoney(o.total)}</Sum>
                    <Sum label="Balance due" strong>{formatMoney(0)}</Sum>
                  </>
                ) : (
                  <Sum label="Balance due" strong>{formatMoney(o.total)}</Sum>
                )}
              </div>
            )}
          </dl>
        </section>

        {/* ── Delivery terms ── */}
        {terms.length > 0 && (
          <section className="border-t border-line py-6 print:py-3 break-inside-avoid">
            <p className={`${LABEL} text-(--inv-accent)`}>Delivery terms &amp; order limits</p>
            <ul className="mt-2 grid gap-x-8 gap-y-1 leading-relaxed sm:grid-cols-2">
              {terms.map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden className="text-(--inv-accent)">&mdash;</span>
                  {line}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Chain of custody ── */}
        <section className="border-t border-line py-6 print:py-3 break-inside-avoid">
          <p className={`${LABEL} text-(--inv-accent)`}>Transfer of custody</p>
          <div className="mt-2 divide-y divide-line">
            {["Released by", "Received by"].map((who) => (
              <div key={who} className="grid grid-cols-[6.5rem_1fr_1fr_6rem] items-end gap-4 py-4 print:py-2">
                <p className="font-medium">{who}</p>
                {["Printed name", "Signature", "Date"].map((field) => (
                  <div key={field}>
                    <div className="h-7 border-b border-ink/60" />
                    <p className={`mt-1 ${LABEL} text-ink-soft`}>{field}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Platform footer ── */}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-8 py-4 sm:px-10 print:px-6 print:py-3">
        <div className="flex items-center gap-3">
          {/* The logo's cream lettering needs a dark ground on white paper */}
          <span className="rounded-[3px] bg-night px-2 py-1.5">
            <Image src="/spectra-logo.png" alt="Spectra Wholesale" width={1774} height={887} className="h-auto w-20" />
          </span>
          <p className="text-[11px] leading-snug text-ink-soft">
            Ordered through Spectra Wholesale
            <br />
            Alaska&rsquo;s cannabis wholesale marketplace
          </p>
        </div>
        <p className={`${LABEL} text-ink-soft`}>
          {o.order_number} &middot; spectrawholesale.com
        </p>
      </footer>
    </article>
  );
}

function Fact({ label, band, children }: { label: string; band: boolean; children: React.ReactNode }) {
  return (
    <div>
      <dt className={`${LABEL} ${band ? "opacity-70" : "text-ink-soft"}`}>{label}</dt>
      <dd className="mt-0.5 font-medium whitespace-nowrap">{children}</dd>
    </div>
  );
}

function Term({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5">
      <dt className={`${LABEL} text-ink-soft`}>{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function Sum({ label, strong, children }: { label: string; strong?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? "font-medium" : "text-ink-soft"}>{label}</dt>
      <dd className={`font-mono ${strong ? "text-[15px] font-medium" : ""}`}>{children}</dd>
    </div>
  );
}
