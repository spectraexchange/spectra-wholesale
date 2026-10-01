"use server";

import { revalidatePath } from "next/cache";
import { requireBuyer } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export type CartResult = { ok?: string; error?: string };

// A product a buyer may order: visible, not archived, from an approved, active vendor.
async function orderableProduct(productId: string) {
  const { data } = await createServiceClient()
    .from("products")
    .select("id, name, stock_qty, min_order_qty, is_active, is_archived, companies!inner(is_active, is_approved)")
    .eq("id", productId)
    .maybeSingle();
  const vendor = Array.isArray(data?.companies) ? data.companies[0] : data?.companies;
  if (!data || !data.is_active || data.is_archived || !vendor?.is_active || !vendor?.is_approved) return null;
  return data;
}

export async function addToCart(productId: string, quantity: number): Promise<CartResult> {
  const viewer = await requireBuyer();
  if (!Number.isInteger(quantity) || quantity < 1) return { error: "Enter a whole number." };

  const product = await orderableProduct(productId);
  if (!product) return { error: "This product isn’t available anymore." };

  const service = createServiceClient();
  const { data: existing } = await service
    .from("cart_items")
    .select("id, quantity")
    .eq("buyer_profile_id", viewer.id)
    .eq("product_id", productId)
    .maybeSingle();

  const total = (existing?.quantity ?? 0) + quantity;
  if (total > product.stock_qty) {
    return { error: product.stock_qty === 0 ? "Out of stock." : `Only ${product.stock_qty} available.` };
  }

  const { error } = existing
    ? await service.from("cart_items").update({ quantity: total }).eq("id", existing.id)
    : await service.from("cart_items").insert({ buyer_profile_id: viewer.id, product_id: productId, quantity });
  if (error) return { error: "Couldn’t add to cart. Try again." };

  revalidatePath("/buyer", "layout");
  return { ok: existing ? `${total} in cart` : "Added to cart" };
}

export async function updateCartQuantity(itemId: string, quantity: number): Promise<CartResult> {
  const viewer = await requireBuyer();
  if (!Number.isInteger(quantity) || quantity < 0) return { error: "Enter a whole number." };

  const service = createServiceClient();
  const { error } =
    quantity === 0
      ? await service.from("cart_items").delete().eq("id", itemId).eq("buyer_profile_id", viewer.id)
      : await service.from("cart_items").update({ quantity }).eq("id", itemId).eq("buyer_profile_id", viewer.id);
  if (error) return { error: "Couldn’t update the cart." };

  revalidatePath("/buyer", "layout");
  return { ok: "Updated" };
}

export async function removeFromCart(itemId: string): Promise<CartResult> {
  return updateCartQuantity(itemId, 0);
}
