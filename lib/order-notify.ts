import { headers } from "next/headers";
import { formatMoney, formatQty } from "@/lib/catalog";
import { newOrderEmail, orderUpdateEmail, sendEmail } from "@/lib/email";
import { formatDeliveryDate, type Order, type OrderItem } from "@/lib/orders";
import { createServiceClient } from "@/lib/supabase/server";

const FROM = "Spectra Wholesale Orders <orders@spectrawholesale.com>";

type Company = { id: string; name: string; email: string | null; address: string | null; city: string | null; zip: string | null };

async function loadOrder(orderId: string) {
  const { data } = await createServiceClient()
    .from("orders")
    .select(
      "*, items:order_items(*), buyer:companies!orders_buyer_company_id_fkey(id, name, email, address, city, zip), seller:companies!orders_seller_company_id_fkey(id, name, email, address, city, zip)",
    )
    .eq("id", orderId)
    .single();
  return data as (Order & { items: OrderItem[]; buyer: Company; seller: Company }) | null;
}

async function origin() {
  return (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://spectrawholesale.com";
}

const emailLines = (items: OrderItem[]) =>
  items.map((i) => ({ name: i.product_name, qty: formatQty(i.quantity, i.unit), lineTotal: formatMoney(i.line_total) }));

// Best effort: an order is never rolled back because an email failed.
export async function notifyOrderPlaced(orderId: string) {
  const order = await loadOrder(orderId);
  if (!order) return;
  const base = await origin();
  const total = formatMoney(order.total);
  const lines = emailLines(order.items);

  await Promise.allSettled([
    order.seller.email &&
      sendEmail({
        from: FROM,
        to: order.seller.email,
        subject: `New order ${order.order_number} from ${order.buyer.name}`,
        html: newOrderEmail({
          orderNumber: order.order_number,
          buyer: order.buyer.name,
          deliverTo: [order.buyer.address, order.buyer.city].filter(Boolean).join(", "),
          notes: order.notes,
          lines,
          total,
          link: `${base}/seller/orders/${order.id}`,
        }),
      }),
    order.buyer.email &&
      sendEmail({
        from: FROM,
        to: order.buyer.email,
        subject: `Order ${order.order_number} placed with ${order.seller.name}`,
        html: orderUpdateEmail({
          status: "pending",
          orderNumber: order.order_number,
          vendor: order.seller.name,
          deliveryDate: null,
          lines,
          total,
          link: `${base}/buyer/orders/${order.id}`,
        }),
      }),
  ]);
}

export async function notifyOrderStatus(orderId: string) {
  const order = await loadOrder(orderId);
  if (!order?.buyer.email) return;

  await sendEmail({
    from: FROM,
    to: order.buyer.email,
    subject: `Order ${order.order_number}: ${order.status === "shipped" ? "out for delivery" : order.status}`,
    html: orderUpdateEmail({
      status: order.status,
      orderNumber: order.order_number,
      vendor: order.seller.name,
      deliveryDate: order.delivery_date ? formatDeliveryDate(order.delivery_date) : null,
      lines: emailLines(order.items),
      total: formatMoney(order.total),
      link: `${await origin()}/buyer/orders/${order.id}`,
    }),
  }).catch(() => undefined);
}
