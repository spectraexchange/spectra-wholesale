import type { Metadata } from "next";
import Link from "next/link";
import { ORDER_SELECT, OrderList, type OrderWithParties } from "@/components/orders";
import { requireBuyer } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Orders · Spectra Wholesale" };

export default async function BuyerOrdersPage() {
  const { company } = await requireBuyer();
  const { data } = await createServiceClient()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("buyer_company_id", company.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">Purchasing</p>
      <h1 className="mt-2 font-display text-5xl font-light tracking-tight">Orders</h1>
      <div className="mt-10 border-t border-ink">
        <OrderList
          orders={(data ?? []) as OrderWithParties[]}
          hrefBase="/buyer/orders"
          counterparty="seller"
          empty={
            <>
              No orders yet.{" "}
              <Link href="/buyer/browse" className="text-ink underline decoration-sunset decoration-2 underline-offset-4 hover:text-sunset">
                Browse products
              </Link>
            </>
          }
        />
      </div>
    </>
  );
}
