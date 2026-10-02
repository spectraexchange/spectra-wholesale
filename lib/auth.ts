import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Role and company reads go through the service client: the regular client's RLS
// can't see other rows reliably for super_admin in server contexts.

export type Viewer = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  company: { id: string; name: string; type: string; is_active: boolean } | null;
};

export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await createServiceClient()
    .from("profiles")
    .select("full_name, role, companies(id, name, type, is_active)")
    .eq("id", user.id)
    .single();

  const company = Array.isArray(profile?.companies) ? profile.companies[0] : profile?.companies;
  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name ?? user.email ?? "",
    role: profile?.role ?? "",
    company: company ?? null,
  };
}

export function homeFor(role: string) {
  if (role === "super_admin") return "/admin";
  if (role === "seller" || role === "seller_admin") return "/seller/products";
  if (role === "buyer" || role === "buyer_admin") return "/buyer/browse";
  return "/dashboard";
}

export async function requireSuperAdmin() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "super_admin") redirect(homeFor(viewer.role));
  return viewer;
}

// Vendors always act on behalf of their own company; every seller query filters by it.
export async function requireSeller() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!["seller", "seller_admin"].includes(viewer.role) || !viewer.company) redirect(homeFor(viewer.role));
  if (!viewer.company.is_active) redirect("/paused");
  return viewer as Viewer & { company: NonNullable<Viewer["company"]> };
}

// Buyers act for their own company; carts are per user, orders per company.
export async function requireBuyer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!["buyer", "buyer_admin"].includes(viewer.role) || !viewer.company) redirect(homeFor(viewer.role));
  if (!viewer.company.is_active) redirect("/paused");
  return viewer as Viewer & { company: NonNullable<Viewer["company"]> };
}
