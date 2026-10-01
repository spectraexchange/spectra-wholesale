import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ORDER_SELECT, OrderSummary, StatusLabel, type OrderWithParties } from "@/components/orders";
import { requireSeller } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { OrderActions } from "../order-actions";

export const metadata: Metadata = { title: "Order · Spectra Wholesale" };

export default async function SellerOrderPage({ params }: PageProps<"/seller/orders/[id]">) {
  const { company } = await requireSeller();
  const { id } = await params;

  const { data } = await createServiceClient()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .eq("seller_company_id", company.id)
    .maybeSingle();
  if (!data) notFound();
  const order = data as OrderWithParties;

  return (
    <>
      <Link href="/seller/orders" className="text-sm text-ink-soft hover:text-sunset">
        &larr; Orders
      </Link>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[13px] text-ink-soft">{order.order_number}</p>
          <h1 className="mt-1 font-display text-5xl font-light tracking-tight">{order.buyer.name}</h1>
        </div>
        <StatusLabel status={order.status} />
      </div>

      <div className="mt-12 grid gap-14 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <OrderSummary order={order} side="seller" />
        <div className="xl:border-l xl:border-line xl:pl-10">
          <h2 className="mb-5 font-display text-2xl">Actions</h2>
          <OrderActions
            orderId={order.id}
            status={order.status}
            deliveryDate={order.delivery_date}
            paid={order.payment_status === "paid"}
          />
        </div>
      </div>
    </>
  );
}
