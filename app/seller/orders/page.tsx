import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Orders · Spectra Wholesale" };

export default function SellerOrdersPage() {
  return (
    <>
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">Sales</p>
      <h1 className="mt-2 font-display text-5xl font-light tracking-tight">Orders</h1>
      <div className="mt-10 border-t border-ink pt-10">
        <p className="max-w-lg text-ink-soft">
          Orders from buyers will land here. Make sure your{" "}
          <Link href="/seller/products" className="text-ink underline decoration-sunset decoration-2 underline-offset-4 hover:text-sunset">
            products
          </Link>{" "}
          are listed and visible so buyers can find them.
        </p>
      </div>
    </>
  );
}
