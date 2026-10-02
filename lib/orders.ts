// Order vocabulary. Statuses must match the `orders.status` check constraint.

export const ORDER_STATUSES = {
  pending: { label: "New", tone: "text-pending" },
  confirmed: { label: "Confirmed", tone: "text-info" },
  shipped: { label: "Out for delivery", tone: "text-info" },
  delivered: { label: "Delivered", tone: "text-success" },
  cancelled: { label: "Cancelled", tone: "text-danger" },
} as const;
export type OrderStatus = keyof typeof ORDER_STATUSES;

// What a vendor can move an order to from each status. Cancel goes through
// the cancel_order() function so stock is restored.
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "delivered", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export type Order = {
  id: string;
  order_number: string;
  buyer_company_id: string;
  seller_company_id: string;
  status: OrderStatus;
  notes: string | null;
  subtotal: number;
  discount_percent: number;
  shipping_cost: number;
  total: number; // generated: subtotal less discount, plus shipping
  delivery_date: string | null;
  payment_status: "unpaid" | "paid";
  payment_date: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_category: string;
  sku: string | null;
  quantity: number;
  unit: string;
  price_per_unit: number;
  line_total: number;
};

// Dollar amount taken off by the order's discount (matches the generated `total`).
export const discountAmount = (o: Pick<Order, "subtotal" | "discount_percent">) =>
  Math.round(Number(o.subtotal) * Number(o.discount_percent)) / 100;

const AK = "America/Anchorage";
const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: AK });
const dateOnly = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

export const formatPlaced = (iso: string) => dateTime.format(new Date(iso));
// delivery_date is a plain date column; format it without shifting time zones
export const formatDeliveryDate = (date: string) => dateOnly.format(new Date(`${date}T00:00:00Z`));
