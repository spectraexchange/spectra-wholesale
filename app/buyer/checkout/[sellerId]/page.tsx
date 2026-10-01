import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireBuyer } from "@/lib/auth";
import { formatMoney, formatQty } from "@/lib/catalog";
import { createServiceClient } from "@/lib/supabase/server";
import { loadCart } from "../../cart/load-cart";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout · Spectra Wholesale" };

export default async function CheckoutPage({ params }: PageProps<"/buyer/checkout/[sellerId]">) {
  const viewer = await requireBuyer();
  const { sellerId } = await params;

  const [cart] = await loadCart(viewer.id, sellerId);
  // Nothing to check out, or something needs fixing first
  if (!cart || !cart.canCheckout) redirect("/buyer/cart");

  const { data: company } = await createServiceClient()
    .from("companies")
    .select("name, address, city, zip, phone, receiving_hours, delivery_instructions")
    .eq("id", viewer.company.id)
    .single();

  const total = formatMoney(cart.subtotal);

  return (
    <>
      <Link href="/buyer/cart" className="text-sm text-ink-soft hover:text-sunset">
        &larr; Cart
      </Link>
      <h1 className="mt-3 font-display text-5xl font-light tracking-tight">Check out</h1>
      <p className="mt-3 text-ink-soft">
        Order from <span className="text-ink">{cart.vendor.name}</span>. Other vendors in your cart stay put.
      </p>

      <div className="mt-12 grid gap-14 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section>
          <h2 className="border-b border-ink pb-3 font-display text-2xl">Items</h2>
          <ul className="divide-y divide-line">
            {cart.lines.map((line) => (
              <li key={line.id} className="flex items-baseline justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="truncate">{line.product.name}</p>
                  <p className="text-[13px] text-ink-soft">
                    {formatQty(line.quantity, line.product.unit)} &times; {formatMoney(line.product.price_per_unit)}
                  </p>
                </div>
                <p className="font-mono">{formatMoney(line.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between border-t border-ink pt-4">
            <p className="font-medium">Total</p>
            <p className="font-mono text-2xl">{total}</p>
          </div>

          <h2 className="mt-14 border-b border-ink pb-3 font-display text-2xl">Deliver to</h2>
          <dl className="divide-y divide-line text-[15px]">
            {[
              ["Business", company?.name],
              ["Address", [company?.address, [company?.city, company?.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")],
              ["Phone", company?.phone],
              ["Receiving", company?.receiving_hours],
              ["Instructions", company?.delivery_instructions],
            ]
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label} className="grid grid-cols-[8rem_1fr] gap-4 py-3">
                  <dt className="font-mono text-[11px] leading-6 tracking-[0.14em] text-ink-soft uppercase">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
        </section>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <CheckoutForm sellerId={cart.vendor.id} vendorName={cart.vendor.name} total={total} />
        </aside>
      </div>
    </>
  );
}
