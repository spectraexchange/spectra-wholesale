import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/form";
import { ORDER_SELECT, OrderSummary, StatusLabel, type OrderWithParties } from "@/components/orders";
import { requireBuyer } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Order · Spectra Wholesale" };

export default async function BuyerOrderPage({ params, searchParams }: PageProps<"/buyer/orders/[id]">) {
  const { company } = await requireBuyer();
  const { id } = await params;
  const { placed } = await searchParams;

  const { data } = await createServiceClient()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .eq("buyer_company_id", company.id)
    .maybeSingle();
  if (!data) notFound();
  const order = data as OrderWithParties;

  return (
    <>
      <Link href="/buyer/orders" className="text-sm text-ink-soft hover:text-sunset">
        &larr; Orders
      </Link>

      {placed && (
        <div className="mt-6">
          <Notice tone="success">
            Order placed. {order.seller.name} has been notified and will confirm a delivery date.
          </Notice>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[13px] text-ink-soft">{order.order_number}</p>
          <h1 className="mt-1 font-display text-5xl font-light tracking-tight">{order.seller.name}</h1>
        </div>
        <StatusLabel status={order.status} />
      </div>

      <div className="mt-12">
        <OrderSummary order={order} side="buyer" />
      </div>
    </>
  );
}
