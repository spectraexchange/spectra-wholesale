import type { Product } from "@/lib/catalog";
import { createServiceClient } from "@/lib/supabase/server";

export type Vendor = { id: string; name: string; city: string | null };
export type CatalogProduct = Product & { vendor: Vendor };

const SELECT = "*, vendor:companies!inner(id, name, city, type, is_active, is_approved)";

// Products buyers can see and order: visible, not archived, from approved, active vendors.
export function catalogQuery() {
  return createServiceClient()
    .from("products")
    .select(SELECT)
    .eq("is_active", true)
    .eq("is_archived", false)
    .eq("vendor.is_active", true)
    .eq("vendor.is_approved", true)
    .eq("vendor.type", "seller");
}

export function toCatalogProduct(row: Record<string, unknown>): CatalogProduct {
  const vendor = Array.isArray(row.vendor) ? row.vendor[0] : row.vendor;
  return { ...(row as Product), vendor: vendor as Vendor };
}
