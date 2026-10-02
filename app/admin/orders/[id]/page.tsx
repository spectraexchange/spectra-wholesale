import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ORDER_SELECT, OrderSummary, StatusLabel, type OrderWithParties } from "@/components/orders";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Order · Spectra Admin" };

// Read-only: vendors manage their own orders; admins can see every order.
export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const { data } = await createServiceClient().from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle();
  if (!data) notFound();
  const order = data as OrderWithParties;

  return (
    <>
      <Link href="/admin/orders" className="text-sm text-ink-soft hover:text-sunset">
        &larr; Orders
      </Link>
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[13px] text-ink-soft">{order.order_number}</p>
          <h1 className="mt-1 font-display text-4xl font-light tracking-tight sm:text-5xl">
            <Link href={`/admin/companies/${order.buyer.id}`} className="hover:text-sunset">{order.buyer.name}</Link>
            <span className="text-ink-soft"> &rarr; </span>
            <Link href={`/admin/companies/${order.seller.id}`} className="hover:text-sunset">{order.seller.name}</Link>
          </h1>
        </div>
        <StatusLabel status={order.status} />
      </div>
      <div className="mt-12">
        <OrderSummary order={order} side="admin" />
      </div>
    </>
  );
}
