import type { InvoiceData } from "@/components/invoice";

// Made-up order used to preview invoice designs in Tools.
const item = (n: number, name: string, category: string, sub: string | null, strain: string, sku: string, thc: number, qty: number, unit: string, price: number) => ({
  id: `sample-${n}`,
  order_id: "sample",
  product_id: null,
  product_name: name,
  product_category: category,
  sku,
  quantity: qty,
  unit,
  price_per_unit: price,
  line_total: Math.round(qty * price * 100) / 100,
  product: { thc_percentage: thc, sub_category: sub, strain_type: strain },
});

const items = [
  item(1, "Glacier Gas 1g Live Resin Cart", "cartridge", "510_thread", "indica_dom", "GG-1021", 81.4, 10, "unit", 34),
  item(2, "Tundra Mints 0.5g Disposable", "disposable", "disposable_vape", "hybrid", "TM-0507", 74.2, 20, "unit", 22),
  item(3, "Fireweed Haze Pre-Roll 1g", "preroll", "single", "sativa", "FH-1100", 26.9, 120, "unit", 3.5),
  item(4, "Kenai Kush A Bud", "flower", "a_bud", "indica", "KK-A-16", 24.1, 2, "oz", 140),
];
const subtotal = items.reduce((s, i) => s + i.line_total, 0);

export const SAMPLE_INVOICE: InvoiceData = {
  id: "sample",
  order_number: "SW-10482",
  buyer_company_id: "buyer",
  seller_company_id: "seller",
  status: "confirmed",
  notes: "Please call 30 minutes before arrival.",
  subtotal,
  discount_percent: 5,
  shipping_cost: 0,
  total: Math.round(subtotal * 95) / 100,
  delivery_date: "2026-10-08",
  payment_status: "unpaid",
  payment_date: null,
  created_at: "2026-10-02T18:30:00Z",
  updated_at: "2026-10-02T18:30:00Z",
  items,
  buyer: {
    id: "buyer",
    name: "Northern Light Dispensary",
    address: "1200 W Northern Lights Blvd",
    city: "Anchorage",
    zip: "99503",
    phone: "(907) 555-0142",
    email: "orders@northernlight.example",
    license_number: "10001",
    receiving_hours: "Mon–Fri, 10am–4pm",
  },
  seller: {
    id: "seller",
    name: "Mat-Su Craft Cultivation",
    address: "4400 E Palmer-Wasilla Hwy",
    city: "Wasilla",
    zip: "99654",
    phone: "(907) 555-0199",
    email: "wholesale@matsucraft.example",
    license_number: "20002",
    logo_url: null,
    invoice_payable_to: "Checks payable to Mat-Su Craft Cultivation LLC. Orders over $10,000: split into two checks. Cash on delivery preferred.",
    invoice_terms: "Free delivery in Wasilla & Palmer\nAnchorage: $1,000 minimum order\nOrders under $5,000 arrange their own transport\nMaximum 5 lb flower per order",
    invoice_turnaround: "1–2 days Mat-Su · Anchorage Tue–Wed",
    invoice_payment_terms: "COD",
  },
};
