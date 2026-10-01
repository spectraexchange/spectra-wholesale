import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Role reads go through the service client: the regular client's RLS can't see
// other rows reliably for super_admin in server contexts.
export async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await createServiceClient()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") redirect("/dashboard");

  return user;
}
