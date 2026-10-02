import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { clearViewAsCookie, readViewAs } from "@/lib/view-as";

// Ends a "view as" session and signs the browser back in as the admin who started it.
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;
  const viewAs = await readViewAs();
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearViewAsCookie();

  if (!viewAs) return NextResponse.redirect(new URL("/login", origin));

  const service = createServiceClient();
  const { data: admin } = await service.from("profiles").select("email, role").eq("id", viewAs.adminId).single();
  if (admin?.role !== "super_admin") return NextResponse.redirect(new URL("/login", origin));

  const { data: link } = await service.auth.admin.generateLink({ type: "magiclink", email: admin.email });
  const token = link?.properties?.hashed_token;
  const { error } = token ? await supabase.auth.verifyOtp({ token_hash: token, type: "magiclink" }) : { error: true };
  if (error) return NextResponse.redirect(new URL("/login", origin));

  await audit({
    adminId: viewAs.adminId,
    action: "view_as_end",
    companyId: viewAs.companyId,
    userId: viewAs.targetId,
    details: { name: viewAs.targetName, minutes: Math.round((Date.now() - viewAs.startedAt) / 60000) },
  });
  return NextResponse.redirect(new URL(`/admin/companies/${viewAs.companyId}`, origin));
}
