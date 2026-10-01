import type { Metadata } from "next";
import Link from "next/link";
import { requireBuyer } from "@/lib/auth";
import { formatMoney, unitLabel } from "@/lib/catalog";
import { loadCart } from "./load-cart";
import { QuantityControl } from "./quantity-control";

export const metadata: Metadata = { title: "Cart · Spectra Wholesale" };

export default async function CartPage() {
  const viewer = await requireBuyer();
  const carts = await loadCart(viewer.id);

  return (
    <>
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">
        {carts.length > 1 ? `${carts.length} vendors · each checks out separately` : "Cart"}
      </p>
      <h1 className="mt-2 font-display text-5xl font-light tracking-tight">Your cart</h1>

      {carts.length === 0 ? (
        <div className="mt-10 border-t border-ink pt-10">
          <p className="text-ink-soft">
            Your cart is empty.{" "}
            <Link href="/buyer/browse" className="text-ink underline decoration-sunset decoration-2 underline-offset-4 hover:text-sunset">
              Browse products
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-10 space-y-16">
          {carts.map((cart) => (
            <section key={cart.vendor.id}>
              <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-3">
                <h2 className="font-display text-2xl">{cart.vendor.name}</h2>
                {cart.vendor.city && <p className="font-mono text-[11px] tracking-[0.16em] text-ink-soft uppercase">{cart.vendor.city}</p>}
              </div>

              <ul className="divide-y divide-line">
                {cart.lines.map((line) => (
                  <li key={line.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-5 gap-y-3 py-5 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto_7rem]">
                    {line.product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- vendor-uploaded, arbitrary dimensions
                      <img src={line.product.image_url} alt="" className="aspect-square w-full rounded-[3px] border border-line object-cover" />
                    ) : (
                      <div className="aspect-square w-full rounded-[3px] border border-dashed border-line bg-paper-deep" />
                    )}
                    <div className="min-w-0">
                      <Link href={`/buyer/products/${line.product.id}`} className="block truncate font-display text-lg hover:text-sunset">
                        {line.product.name}
                      </Link>
                      <p className="text-[13px] text-ink-soft">
                        {formatMoney(line.product.price_per_unit)} / {unitLabel(line.product.unit)}
                      </p>
                      {line.issue && <p className="mt-1 text-[13px] text-danger">{line.issue}</p>}
                    </div>
                    <div className="col-start-2 sm:col-start-auto">
                      <QuantityControl itemId={line.id} quantity={line.quantity} max={line.product.stock_qty} label={line.product.name} />
                    </div>
                    <p className="col-start-2 font-mono text-[15px] sm:col-start-auto sm:text-right">{formatMoney(line.lineTotal)}</p>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink pt-5">
                <p>
                  <span className="text-ink-soft">Subtotal </span>
                  <span className="font-mono text-xl">{formatMoney(cart.subtotal)}</span>
                </p>
                {cart.canCheckout ? (
                  <Link
                    href={`/buyer/checkout/${cart.vendor.id}`}
                    className="group inline-flex items-center gap-2 rounded-[3px] bg-sunset px-5 py-3 text-[15px] font-semibold text-on-sunset shadow-[3px_3px_0_0_var(--press)] transition-[background-color,transform,box-shadow] duration-100 hover:bg-sunset-hover active:translate-x-[3px] active:translate-y-[3px] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sunset"
                  >
                    Check out with {cart.vendor.name}
                    <span aria-hidden className="transition-transform duration-150 group-hover:translate-x-1">
                      &rarr;
                    </span>
                  </Link>
                ) : (
                  <p className="text-[14px] text-danger">Fix the items above to check out.</p>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
