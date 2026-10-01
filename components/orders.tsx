import Link from "next/link";
import { formatMoney, formatQty } from "@/lib/catalog";
import { ORDER_STATUSES, formatDeliveryDate, formatPlaced, type Order, type OrderItem } from "@/lib/orders";

export type OrderWithParties = Order & {
  items: OrderItem[];
  buyer: { id: string; name: string; address: string | null; city: string | null; zip: string | null; phone: string | null; email: string | null; receiving_hours: string | null; delivery_instructions: string | null };
  seller: { id: string; name: string; city: string | null; phone: string | null; email: string | null };
};

// Both sides of an order embed the two companies by their FK names.
export const ORDER_SELECT =
  "*, items:order_items(*), buyer:companies!orders_buyer_company_id_fkey(id, name, address, city, zip, phone, email, receiving_hours, delivery_instructions), seller:companies!orders_seller_company_id_fkey(id, name, city, phone, email)";

export function StatusLabel({ status }: { status: Order["status"] }) {
  const s = ORDER_STATUSES[status];
  return <span className={`font-mono text-[11px] tracking-[0.16em] uppercase ${s.tone}`}>{s.label}</span>;
}

export function OrderList({
  orders,
  hrefBase,
  counterparty,
  empty,
}: {
  orders: OrderWithParties[];
  hrefBase: string;
  counterparty: "buyer" | "seller";
  empty: React.ReactNode;
}) {
  if (!orders.length) return <div className="py-14 text-ink-soft">{empty}</div>;

  return (
    <ul className="divide-y divide-line">
      {orders.map((o) => (
        <li key={o.id}>
          <Link
            href={`${hrefBase}/${o.id}`}
            className="group grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1 py-5 sm:grid-cols-[7.5rem_minmax(0,1fr)_9rem_8rem]"
          >
            <span className="font-mono text-[14px] group-hover:text-sunset">{o.order_number}</span>
            <span className="col-start-1 row-start-2 min-w-0 truncate sm:col-start-auto sm:row-start-auto">
              <span className="font-display text-lg group-hover:text-sunset">{o[counterparty].name}</span>
              <span className="ml-2 text-[13px] text-ink-soft">
                {o.items.length} {o.items.length === 1 ? "item" : "items"} &middot; {formatPlaced(o.created_at)}
              </span>
            </span>
            <span className="text-right sm:text-left">
              <StatusLabel status={o.status} />
            </span>
            <span className="row-start-2 text-right font-mono sm:row-start-auto">{formatMoney(o.subtotal)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function OrderSummary({ order, side }: { order: OrderWithParties; side: "buyer" | "seller" }) {
  const other = side === "buyer" ? order.seller : order.buyer;
  const address = [order.buyer.address, [order.buyer.city, order.buyer.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section>
        <h2 className="border-b border-ink pb-3 font-display text-2xl">Items</h2>
        <ul className="divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="truncate">{item.product_name}</p>
                <p className="text-[13px] text-ink-soft">
                  {formatQty(item.quantity, item.unit)} &times; {formatMoney(item.price_per_unit)}
                  {item.sku && <span className="font-mono"> &middot; {item.sku}</span>}
                </p>
              </div>
              <p className="font-mono">{formatMoney(item.line_total)}</p>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-ink pt-4">
          <p className="font-medium">Total</p>
          <p className="font-mono text-2xl">{formatMoney(order.subtotal)}</p>
        </div>

        {order.notes && (
          <div className="mt-10">
            <h3 className="font-mono text-[11px] tracking-[0.16em] text-ink-soft uppercase">Notes from the buyer</h3>
            <p className="mt-2 border-l-[3px] border-sunset bg-paper-deep px-4 py-3 whitespace-pre-line">{order.notes}</p>
          </div>
        )}
      </section>

      <aside>
        <dl className="divide-y divide-line border-y border-line text-[14px]">
          <Fact label="Placed">{formatPlaced(order.created_at)}</Fact>
          <Fact label="Delivery">
            {order.delivery_date ? formatDeliveryDate(order.delivery_date) : <span className="text-ink-soft">Not scheduled yet</span>}
          </Fact>
          <Fact label="Payment">
            {order.payment_status === "paid" ? <span className="text-success">Paid</span> : <span className="text-ink-soft">Unpaid</span>}
          </Fact>
          <Fact label={side === "buyer" ? "Vendor" : "Buyer"}>
            <span className="block">{other.name}</span>
            {other.phone && <span className="block text-ink-soft">{other.phone}</span>}
            {other.email && (
              <a href={`mailto:${other.email}`} className="block text-ink-soft underline decoration-line underline-offset-4 hover:text-sunset">
                {other.email}
              </a>
            )}
          </Fact>
          <Fact label="Deliver to">
            <span className="block">{address}</span>
            {order.buyer.receiving_hours && <span className="block text-ink-soft">Receiving {order.buyer.receiving_hours}</span>}
            {order.buyer.delivery_instructions && <span className="block text-ink-soft">{order.buyer.delivery_instructions}</span>}
          </Fact>
        </dl>
      </aside>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3">
      <dt className="font-mono text-[11px] tracking-[0.14em] text-ink-soft uppercase">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
