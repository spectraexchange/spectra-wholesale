import type { Product } from "@/lib/catalog";
import { createServiceClient } from "@/lib/supabase/server";

export type CartLine = {
  id: string;
  quantity: number;
  product: Product;
  lineTotal: number;
  issue: string | null; // why this line can't be ordered as-is
};

export type VendorCart = {
  vendor: { id: string; name: string; city: string | null };
  lines: CartLine[];
  subtotal: number;
  canCheckout: boolean;
};

type Row = {
  id: string;
  quantity: number;
  product: (Product & { vendor: VendorCart["vendor"] & { is_active: boolean; is_approved: boolean } }) | null;
};

// The buyer's cart, grouped by vendor, with each line checked the same way
// place_order() will check it.
export async function loadCart(buyerProfileId: string, sellerId?: string): Promise<VendorCart[]> {
  const { data } = await createServiceClient()
    .from("cart_items")
    .select("id, quantity, product:products(*, vendor:companies(id, name, city, is_active, is_approved))")
    .eq("buyer_profile_id", buyerProfileId)
    .order("created_at");

  const groups = new Map<string, VendorCart>();
  for (const row of (data ?? []) as unknown as Row[]) {
    const p = row.product;
    if (!p) continue;
    if (sellerId && p.vendor.id !== sellerId) continue;

    const min = p.min_order_qty ?? 1;
    const issue =
      !p.is_active || p.is_archived || !p.vendor.is_active || !p.vendor.is_approved
        ? "No longer available. Remove it to check out."
        : p.stock_qty <= 0
          ? "Out of stock. Remove it to check out."
          : row.quantity > p.stock_qty
            ? `Only ${p.stock_qty} available.`
            : row.quantity < min
              ? `Minimum order is ${min}.`
              : null;

    const group = groups.get(p.vendor.id) ?? {
      vendor: { id: p.vendor.id, name: p.vendor.name, city: p.vendor.city },
      lines: [],
      subtotal: 0,
      canCheckout: true,
    };
    const lineTotal = Math.round(p.price_per_unit * row.quantity * 100) / 100;
    group.lines.push({ id: row.id, quantity: row.quantity, product: p, lineTotal, issue });
    group.subtotal = Math.round((group.subtotal + lineTotal) * 100) / 100;
    group.canCheckout &&= !issue;
    groups.set(p.vendor.id, group);
  }

  return [...groups.values()].sort((a, b) => a.vendor.name.localeCompare(b.vendor.name));
}
