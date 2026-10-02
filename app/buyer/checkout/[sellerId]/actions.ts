"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBuyer } from "@/lib/auth";
import { notifyOrderPlaced } from "@/lib/order-notify";
import { createServiceClient } from "@/lib/supabase/server";

export type CheckoutState = { error?: string };

// place_order() raises "kind:detail[:detail]"; turn those into buyer-facing copy.
function explain(message: string) {
  const [kind, name, n] = message.split(":");
  switch (kind) {
    case "cart_empty":
      return "There’s nothing from this vendor in your cart anymore.";
    case "unavailable":
      return `“${name}” is no longer available. Remove it from your cart to continue.`;
    case "stock":
      return `Only ${n} of “${name}” are left. Lower the quantity in your cart.`;
    case "minimum":
      return `“${name}” has a minimum order of ${n}.`;
    default:
      return "We couldn’t place the order. Nothing was charged or changed. Try again.";
  }
}

export async function placeOrder(sellerId: string, _prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const viewer = await requireBuyer();
  const notes = String(formData.get("notes") ?? "").slice(0, 1000);

  const service = createServiceClient();
  const { data: vendor } = await service.from("companies").select("is_active, is_approved").eq("id", sellerId).maybeSingle();
  if (!vendor?.is_active || !vendor.is_approved) {
    return { error: "This vendor isn\u2019t taking orders right now. Remove their items from your cart to continue." };
  }

  const { data, error } = await service.rpc("place_order", {
    p_buyer_profile_id: viewer.id,
    p_seller_company_id: sellerId,
    p_notes: notes,
  });

  if (error || !data?.[0]) {
    if (error?.code === "PGRST202") return { error: "Checkout isn’t set up in the database yet (run the orders migration)." };
    return { error: explain(error?.message ?? "") };
  }

  const { order_id } = data[0] as { order_id: string; order_number: string };
  await notifyOrderPlaced(order_id).catch(() => undefined);

  revalidatePath("/buyer", "layout");
  redirect(`/buyer/orders/${order_id}?placed=1`);
}
