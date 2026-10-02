"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatPhone } from "@/lib/access-requests";
import { audit } from "@/lib/audit";
import { homeFor, requireSuperAdmin } from "@/lib/auth";
import { PAYMENT_METHODS, SUBSCRIPTION_STATUSES, type SubscriptionStatus } from "@/lib/billing";
import { passwordResetEmail, sendEmail } from "@/lib/email";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { setViewAsCookie } from "@/lib/view-as";

export type AdminFormState = { ok?: string; error?: string; fieldErrors?: Record<string, string> };

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

function refresh(companyId: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/admin/companies/${companyId}`);
}

async function origin() {
  return (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://www.spectrawholesale.com";
}

// ── Company ────────────────────────────────────────────────────────────────

export async function updateCompanyDetails(id: string, _prev: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireSuperAdmin();
  const service = createServiceClient();
  const { data: company } = await service.from("companies").select("type").eq("id", id).single();
  if (!company) return { error: "Company not found." };

  const patch = {
    name: text(fd, "name"),
    license_number: text(fd, "license_number").toUpperCase(),
    phone: text(fd, "phone"),
    email: text(fd, "email").toLowerCase(),
    address: text(fd, "address"),
    city: text(fd, "city"),
    zip: text(fd, "zip"),
    ...(company.type === "buyer" && {
      receiving_hours: text(fd, "receiving_hours") || null,
      delivery_instructions: text(fd, "delivery_instructions") || null,
    }),
  };

  // Admins can save incomplete records, but what's entered must be well-formed.
  const errors: Record<string, string> = {};
  if (!patch.name) errors.name = "Enter the business name.";
  if (!patch.license_number) errors.license_number = "Enter the license number.";
  if (patch.phone && patch.phone.replace(/\D/g, "").length < 10) errors.phone = "Include the area code.";
  if (patch.email && !isEmail(patch.email)) errors.email = "That email doesn’t look right.";
  if (patch.zip && !/^\d{5}(-\d{4})?$/.test(patch.zip)) errors.zip = "Use a 5-digit ZIP.";
  if (Object.keys(errors).length) return { fieldErrors: errors };

  const { error } = await service
    .from("companies")
    .update({ ...patch, phone: patch.phone ? formatPhone(patch.phone) : null, email: patch.email || null })
    .eq("id", id);
  if (error) return { error: "Couldn’t save. Try again." };

  await audit({ adminId: admin.id, action: "company_update", companyId: id, details: { name: patch.name } });
  refresh(id);
  return { ok: "Company saved." };
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function updateUser(userId: string, _prev: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireSuperAdmin();
  const service = createServiceClient();
  const { data: user } = await service.from("profiles").select("email, role, company_id, companies(type)").eq("id", userId).single();
  if (!user?.company_id) return { error: "User not found." };
  const company = Array.isArray(user.companies) ? user.companies[0] : user.companies;

  const first = text(fd, "first_name");
  const last = text(fd, "last_name");
  const phone = text(fd, "phone");
  const email = text(fd, "email").toLowerCase();
  const access = text(fd, "access"); // "admin" | "member"

  const errors: Record<string, string> = {};
  if (!first) errors.first_name = "Enter a first name.";
  if (!last) errors.last_name = "Enter a last name.";
  if (phone && phone.replace(/\D/g, "").length < 10) errors.phone = "Include the area code.";
  if (!isEmail(email)) errors.email = "Enter a valid email.";
  if (Object.keys(errors).length) return { fieldErrors: errors };

  const role = `${company?.type ?? "buyer"}${access === "admin" ? "_admin" : ""}`;

  // Changing the login email goes through Auth first; it must stay unique.
  if (email !== user.email) {
    const { error } = await service.auth.admin.updateUserById(userId, { email, email_confirm: true });
    if (error) return { fieldErrors: { email: /already|exists|registered/i.test(error.message) ? "Another account already uses that email." : "Couldn’t change the login email." } };
  }

  const { error } = await service
    .from("profiles")
    .update({ first_name: first, last_name: last, full_name: `${first} ${last}`, phone: phone ? formatPhone(phone) : null, email, role })
    .eq("id", userId);
  if (error) return { error: "Couldn’t save. Try again." };

  await audit({
    adminId: admin.id,
    action: "user_update",
    companyId: user.company_id,
    userId,
    details: { name: `${first} ${last}`, ...(email !== user.email && { email_changed: true }), ...(role !== user.role && { role }) },
  });
  refresh(user.company_id);
  return { ok: email !== user.email ? `Saved. They now sign in with ${email}.` : "Saved." };
}

export async function sendPasswordReset(userId: string): Promise<AdminFormState> {
  const admin = await requireSuperAdmin();
  const service = createServiceClient();
  const { data: user } = await service.from("profiles").select("email, first_name, full_name, company_id").eq("id", userId).single();
  if (!user) return { error: "User not found." };

  const { data: link, error } = await service.auth.admin.generateLink({ type: "recovery", email: user.email });
  if (error || !link?.properties?.hashed_token) return { error: "Couldn’t create a reset link." };

  const params = new URLSearchParams({ token_hash: link.properties.hashed_token, type: "recovery", next: "/reset-password" });
  const { error: emailError } = await sendEmail({
    to: user.email,
    subject: "Reset your Spectra Wholesale password",
    html: passwordResetEmail({
      firstName: user.first_name ?? user.full_name?.split(" ")[0] ?? "there",
      link: `${await origin()}/auth/confirm?${params}`,
    }),
  });
  if (emailError) return { error: `Email failed: ${emailError}` };

  await audit({ adminId: admin.id, action: "password_reset_sent", companyId: user.company_id, userId });
  refresh(user.company_id);
  return { ok: `Reset link sent to ${user.email}.` };
}

// Signs this browser in as the user. The signed cookie lets /auth/exit-view-as switch back.
export async function startViewAs(userId: string): Promise<AdminFormState> {
  const admin = await requireSuperAdmin();
  const service = createServiceClient();
  const { data: user } = await service
    .from("profiles")
    .select("email, full_name, role, company_id, companies(name)")
    .eq("id", userId)
    .single();
  if (!user?.company_id) return { error: "User not found." };
  if (user.role === "super_admin") return { error: "You can’t view as another admin." };
  const company = Array.isArray(user.companies) ? user.companies[0] : user.companies;

  const { data: link } = await service.auth.admin.generateLink({ type: "magiclink", email: user.email });
  if (!link?.properties?.hashed_token) return { error: "Couldn’t start the session." };

  await audit({ adminId: admin.id, action: "view_as_start", companyId: user.company_id, userId, details: { name: user.full_name } });

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  if (error) return { error: "Couldn’t start the session." };

  await setViewAsCookie({
    adminId: admin.id,
    targetId: userId,
    targetName: user.full_name ?? user.email,
    companyName: company?.name ?? "",
    companyId: user.company_id,
    startedAt: Date.now(),
  });
  redirect(homeFor(user.role));
}

// ── Subscription & payments ────────────────────────────────────────────────

export async function updateSubscription(companyId: string, _prev: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireSuperAdmin();
  const status = text(fd, "status") as SubscriptionStatus;
  const priceRaw = text(fd, "monthly_price");
  const trialEnds = text(fd, "trial_ends_on");
  const nextDue = text(fd, "next_due_date");
  const notes = text(fd, "notes");

  const errors: Record<string, string> = {};
  if (!(status in SUBSCRIPTION_STATUSES)) errors.status = "Choose a status.";
  const price = priceRaw === "" ? null : Number(priceRaw);
  if (price !== null && (!Number.isFinite(price) || price < 0)) errors.monthly_price = "Enter a dollar amount.";
  if (trialEnds && !isDate(trialEnds)) errors.trial_ends_on = "Pick a date.";
  if (nextDue && !isDate(nextDue)) errors.next_due_date = "Pick a date.";
  if (Object.keys(errors).length) return { fieldErrors: errors };

  const service = createServiceClient();
  const { error } = await service.from("vendor_billing").upsert(
    {
      company_id: companyId,
      status,
      monthly_price: price === null ? null : Math.round(price * 100) / 100,
      trial_ends_on: trialEnds || null,
      next_due_date: nextDue || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" },
  );
  if (error) {
    return { error: error.code === "42703" || error.code === "23514" ? "Run the billing migration first." : "Couldn’t save the subscription." };
  }

  // Deactivated = paused: the company's users are locked out until reactivated.
  await service.from("companies").update({ is_active: status !== "deactivated" }).eq("id", companyId);

  await audit({ adminId: admin.id, action: "subscription_update", companyId, details: { status, monthly_price: price } });
  refresh(companyId);
  return { ok: status === "deactivated" ? "Saved. Their account is now paused." : "Subscription saved." };
}

export async function recordPayment(companyId: string, _prev: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireSuperAdmin();
  const amount = Number(text(fd, "amount"));
  const date = text(fd, "date");
  const method = text(fd, "method");
  const note = text(fd, "note");
  const advance = fd.get("advance_due") === "on";

  const errors: Record<string, string> = {};
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = "Enter the amount received.";
  if (!isDate(date)) errors.date = "Pick the date it was received.";
  if (method && !(PAYMENT_METHODS as readonly string[]).includes(method)) errors.method = "Choose a method.";
  if (Object.keys(errors).length) return { fieldErrors: errors };

  const service = createServiceClient();
  const { error } = await service.from("billing_payments").insert({
    company_id: companyId,
    amount: Math.round(amount * 100) / 100,
    date,
    method: method || null,
    note: note || null,
    recorded_by: admin.id,
  });
  if (error) return { error: error.code === "42703" ? "Run the billing migration first." : "Couldn’t record the payment." };

  // Optionally roll the next due date forward a month (from the old due date, or today)
  if (advance) {
    const { data: sub } = await service.from("vendor_billing").select("next_due_date, status").eq("company_id", companyId).maybeSingle();
    const from = sub?.next_due_date ?? date;
    const next = new Date(`${from}T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    await service
      .from("vendor_billing")
      .update({
        next_due_date: next.toISOString().slice(0, 10),
        // A payment clears a past-due flag
        ...(sub?.status === "past_due" && { status: "active" }),
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId);
  }

  await audit({ adminId: admin.id, action: "payment_recorded", companyId, details: { amount, date, method } });
  refresh(companyId);
  revalidatePath("/admin/billing");
  return { ok: "Payment recorded." };
}

export async function deletePayment(paymentId: string): Promise<AdminFormState> {
  const admin = await requireSuperAdmin();
  const service = createServiceClient();
  const { data: payment } = await service.from("billing_payments").select("company_id, amount, date").eq("id", paymentId).single();
  if (!payment) return { error: "Payment not found." };

  const { error } = await service.from("billing_payments").delete().eq("id", paymentId);
  if (error) return { error: "Couldn’t delete the payment." };

  await audit({ adminId: admin.id, action: "payment_deleted", companyId: payment.company_id, details: { amount: payment.amount, date: payment.date } });
  refresh(payment.company_id);
  revalidatePath("/admin/billing");
  return { ok: "Payment deleted." };
}

