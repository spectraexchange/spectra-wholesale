"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireSuperAdmin } from "@/lib/auth";
import { formatPhone } from "@/lib/access-requests";
import { inviteEmail, sendEmail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/server";

export type ActionResult = { ok?: string; error?: string };

async function appOrigin() {
  return (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://spectrawholesale.com";
}

// Invite links go through our own /auth/confirm (token_hash flow) rather than
// Supabase's redirect, so the session is set server-side via cookies.
function confirmLink(origin: string, hashedToken: string, type: "invite" | "recovery") {
  const params = new URLSearchParams({ token_hash: hashedToken, type, next: "/set-password" });
  return `${origin}/auth/confirm?${params}`;
}

// Approval copies every field from the request onto the company + profile, so the
// new user only has to choose a password.
export async function approveRequest(requestId: string): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const service = createServiceClient();

  // Claim the request atomically so a double-click can't create two companies.
  const { data: req } = await service
    .from("access_requests")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: admin.id })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (!req) return { error: "This request isn\u2019t pending anymore. Refresh the page." };

  const fail = async (error: string): Promise<ActionResult> => {
    await service.from("access_requests").update({ status: "pending", reviewed_at: null, reviewed_by: null }).eq("id", requestId);
    return { error };
  };

  const firstName: string = req.first_name ?? req.full_name.split(" ")[0];
  const lastName: string = req.last_name ?? req.full_name.split(" ").slice(1).join(" ");
  const role = req.account_type === "seller" ? "seller_admin" : "buyer_admin";

  // 1. Company — business, address, delivery, and license data
  const { data: company, error: companyError } = await service
    .from("companies")
    .insert({
      name: req.company,
      type: req.account_type,
      license_number: req.license_number,
      email: req.email,
      phone: formatPhone(req.phone),
      address: req.address,
      city: req.city,
      zip: req.zip,
      receiving_hours: req.receiving_hours,
      delivery_instructions: req.delivery_instructions,
      mj_license_path: req.mj_license_path,
      biz_license_path: req.biz_license_path,
      is_approved: true,
      is_active: true,
    })
    .select("id")
    .single();
  if (companyError || !company) return fail(`Couldn’t create the company: ${companyError?.message}`);

  // 2. Auth user + invite token. No company_name in metadata — the signup
  //    trigger would create a duplicate company from it.
  const { data: link, error: linkError } = await service.auth.admin.generateLink({
    type: "invite",
    email: req.email,
    options: {
      data: { first_name: firstName, last_name: lastName, full_name: `${firstName} ${lastName}`, account_type: req.account_type },
    },
  });
  if (linkError || !link?.properties?.hashed_token) {
    await service.from("companies").delete().eq("id", company.id);
    const message = linkError?.code === "email_exists" ? "That email already has an account." : linkError?.message;
    return fail(`Couldn’t create the login: ${message}`);
  }
  const userId = link.user.id;

  // 3. Profile — upsert in case the signup trigger didn't create the row
  const { error: profileError } = await service.from("profiles").upsert({
    id: userId,
    email: req.email,
    first_name: firstName,
    last_name: lastName,
    full_name: `${firstName} ${lastName}`,
    phone: formatPhone(req.phone),
    role,
    company_id: company.id,
  });
  if (profileError) {
    await service.auth.admin.deleteUser(userId);
    await service.from("companies").delete().eq("id", company.id);
    return fail(`Couldn’t set up the profile: ${profileError.message}`);
  }

  await service.from("access_requests").update({ company_id: company.id }).eq("id", requestId);
  // Every new company starts on a trial subscription (price and dates set later in Billing)
  await service.from("vendor_billing").insert({ company_id: company.id, plan: "standard", status: "trial" }).then(() => undefined, () => undefined);
  revalidatePath("/admin/access-requests");

  // 4. Invite email. The account exists either way; a failure here can be retried.
  const { error: emailError } = await sendEmail({
    to: req.email,
    subject: `You’re approved: ${req.company} on Spectra Wholesale`,
    html: inviteEmail({
      firstName,
      company: req.company,
      accountType: req.account_type,
      link: confirmLink(await appOrigin(), link.properties.hashed_token, "invite"),
    }),
  });
  if (emailError) return { error: `Account created, but the invite email failed (${emailError}). Use “Resend invite”.` };

  return { ok: `${req.company} approved. Invite sent to ${req.email}.` };
}

export async function resendInvite(requestId: string): Promise<ActionResult> {
  await requireSuperAdmin();
  const service = createServiceClient();

  const { data: req } = await service.from("access_requests").select("*").eq("id", requestId).single();
  if (!req || req.status !== "approved") return { error: "Only approved requests can be re-sent." };

  // The user already exists, so a recovery token lands them on the same set-password page.
  const { data: link, error } = await service.auth.admin.generateLink({ type: "recovery", email: req.email });
  if (error || !link?.properties?.hashed_token) return { error: `Couldn’t create a new link: ${error?.message}` };

  const { error: emailError } = await sendEmail({
    to: req.email,
    subject: `Your Spectra Wholesale invite: ${req.company}`,
    html: inviteEmail({
      firstName: req.first_name ?? req.full_name.split(" ")[0],
      company: req.company,
      accountType: req.account_type,
      link: confirmLink(await appOrigin(), link.properties.hashed_token, "recovery"),
    }),
  });
  if (emailError) return { error: `Email failed: ${emailError}` };

  return { ok: `New invite sent to ${req.email}.` };
}

export async function rejectRequest(requestId: string): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const { error } = await createServiceClient()
    .from("access_requests")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: admin.id })
    .eq("id", requestId)
    .eq("status", "pending");
  if (error) return { error: error.message };

  revalidatePath("/admin/access-requests");
  return { ok: "Request rejected." };
}
