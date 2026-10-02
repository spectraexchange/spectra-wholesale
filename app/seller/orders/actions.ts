"use server";

import { revalidatePath } from "next/cache";
import { requireSeller } from "@/lib/auth";
import { notifyOrderStatus } from "@/lib/order-notify";
import { NEXT_STATUS, type OrderStatus } from "@/lib/orders";
import { createServiceClient } from "@/lib/supabase/server";

export type OrderActionResult = { ok?: string; error?: string };

async function ownOrder(orderId: string) {
  const { company } = await requireSeller();
  const { data } = await createServiceClient()
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .eq("seller_company_id", company.id)
    .maybeSingle();
  return data as { id: string; status: OrderStatus } | null;
}

function refresh(orderId: string) {
  revalidatePath("/seller/orders");
  revalidatePath(`/seller/orders/${orderId}`);
}

export async function updateOrderStatus(orderId: string, next: OrderStatus, deliveryDate?: string): Promise<OrderActionResult> {
  const order = await ownOrder(orderId);
  if (!order) return { error: "Order not found." };
  if (!NEXT_STATUS[order.status].includes(next)) return { error: "That change isn’t allowed from the current status." };

  const service = createServiceClient();

  if (next === "cancelled") {
    const { error } = await service.rpc("cancel_order", { p_order_id: orderId });
    if (error) return { error: error.code === "PGRST202" ? "Run the orders migration first." : "Couldn’t cancel the order." };
  } else {
    const patch: Record<string, string> = { status: next, updated_at: new Date().toISOString() };
    if (deliveryDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) return { error: "Pick a delivery date." };
      patch.delivery_date = deliveryDate;
    }
    // Guard on the current status so two tabs can't race each other
    const { data, error } = await service.from("orders").update(patch).eq("id", orderId).eq("status", order.status).select("id");
    if (error || !data?.length) return { error: "Couldn’t update the order. Refresh and try again." };
  }

  await notifyOrderStatus(orderId);
  refresh(orderId);
  return { ok: "Updated. The buyer has been emailed." };
}

export async function setDeliveryDate(orderId: string, deliveryDate: string): Promise<OrderActionResult> {
  const order = await ownOrder(orderId);
  if (!order) return { error: "Order not found." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) return { error: "Pick a delivery date." };

  const { error } = await createServiceClient()
    .from("orders")
    .update({ delivery_date: deliveryDate, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) return { error: "Couldn’t save the date." };

  refresh(orderId);
  return { ok: "Delivery date saved." };
}

export async function setPaymentStatus(orderId: string, paid: boolean): Promise<OrderActionResult> {
  const order = await ownOrder(orderId);
  if (!order) return { error: "Order not found." };

  const { error } = await createServiceClient()
    .from("orders")
    .update({ payment_status: paid ? "paid" : "unpaid", payment_date: paid ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) return { error: "Couldn’t update payment." };

  refresh(orderId);
  return { ok: paid ? "Marked paid." : "Marked unpaid." };
}

export async function setDiscount(orderId: string, percent: number): Promise<OrderActionResult> {
  const order = await ownOrder(orderId);
  if (!order) return { error: "Order not found." };
  if (order.status === "cancelled") return { error: "This order is cancelled." };
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return { error: "Enter a discount from 0 to 100%." };

  const { error } = await createServiceClient()
    .from("orders")
    .update({ discount_percent: Math.round(percent * 100) / 100, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) return { error: error.code === "42703" ? "Run the invoices migration first." : "Couldn’t save the discount." };

  refresh(orderId);
  return { ok: percent ? `${percent}% discount applied.` : "Discount removed." };
}
