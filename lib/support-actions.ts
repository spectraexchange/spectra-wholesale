"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getViewer, requireSuperAdmin, type Viewer } from "@/lib/auth";
import { ADMIN_EMAIL, sendEmail, ticketToCustomerEmail, ticketToStaffEmail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/server";
import { MAX_MESSAGE, TICKET_CATEGORIES, TICKET_STATUSES, categoryName, ticketRef, type Ticket, type TicketStatus } from "@/lib/support";

export type SupportFormState = {
  ok?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Set when a new ticket goes through; the form swaps itself for a confirmation. */
  received?: { ref: string | null; email: string | null; href: string | null };
};

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const origin = async () => (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
const firstName = (name: string) => name.split(" ")[0] || "there";

// Buyers and vendors see their tickets under their own section of the app.
const customerBase = (viewer: Pick<Viewer, "company"> | null) =>
  viewer?.company ? (viewer.company.type === "seller" ? "/seller" : "/buyer") : null;

async function customerLink(ticket: Pick<Ticket, "id" | "user_id">) {
  if (!ticket.user_id) return null;
  const { data } = await createServiceClient().from("profiles").select("role").eq("id", ticket.user_id).maybeSingle();
  const base = data?.role?.startsWith("seller") ? "/seller" : data?.role?.startsWith("buyer") ? "/buyer" : null;
  return base ? `${await origin()}${base}/support/${ticket.id}` : null;
}

function refreshTicket(id: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/buyer/support/${id}`);
  revalidatePath(`/seller/support/${id}`);
  revalidatePath("/buyer/support");
  revalidatePath("/seller/support");
}

/** New ticket from a signed-in buyer/vendor, or from the public form (name + email). */
export async function createTicket(_prev: SupportFormState, formData: FormData): Promise<SupportFormState> {
  // Bots fill every field; people never see this one.
  if (text(formData, "website")) return { received: { ref: null, email: null, href: null } };

  const viewer = await getViewer();
  const base = customerBase(viewer);
  const service = createServiceClient();
  const errors: Record<string, string> = {};

  const category = text(formData, "category");
  const subject = text(formData, "subject");
  const message = text(formData, "message");
  if (!TICKET_CATEGORIES.some((c) => c.value === category)) errors.category = "Choose what this is about.";
  if (!subject) errors.subject = "Add a short summary.";
  else if (subject.length > 150) errors.subject = "Keep it under 150 characters.";
  if (!message) errors.message = "Tell us what’s going on.";
  else if (message.length > MAX_MESSAGE) errors.message = `Keep it under ${MAX_MESSAGE.toLocaleString()} characters.`;

  let who: { name: string; email: string; phone: string | null; company: string | null; user_id: string | null; company_id: string | null };
  if (viewer && base) {
    const { data: profile } = await service.from("profiles").select("full_name, email, phone").eq("id", viewer.id).single();
    who = {
      name: profile?.full_name || viewer.fullName,
      email: profile?.email || viewer.email,
      phone: profile?.phone ?? null,
      company: viewer.company?.name ?? null,
      user_id: viewer.id,
      company_id: viewer.company?.id ?? null,
    };
  } else {
    who = {
      name: text(formData, "name"),
      email: text(formData, "email").toLowerCase(),
      phone: text(formData, "phone") || null,
      company: text(formData, "company") || null,
      user_id: null,
      company_id: null,
    };
    if (!who.name) errors.name = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(who.email)) errors.email = "Enter an email we can reply to.";
  }
  if (Object.keys(errors).length) return { error: "Check the highlighted fields.", fieldErrors: errors };

  // Public form: a few requests per email per hour is plenty
  if (!who.user_id) {
    const { count } = await service
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("email", who.email)
      .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) >= 3) return { error: "You’ve sent a few requests already. We’ll reply to those soon." };
  }

  const { data: ticket, error } = await service
    .from("tickets")
    .insert({ ...who, category, subject, page: text(formData, "page").slice(0, 300) || null })
    .select("id, number, user_id")
    .single();
  if (error || !ticket) return { error: "We couldn’t send your request. Try again, or email info@spectrawholesale.com." };
  await service.from("ticket_messages").insert({ ticket_id: ticket.id, author_id: who.user_id, body: message });

  const ref = ticketRef(ticket.number);
  const site = await origin();
  await Promise.all([
    sendEmail({
      to: ADMIN_EMAIL,
      replyTo: who.email,
      subject: `Support ${ref}: ${subject}`,
      html: ticketToStaffEmail({ ref, subject, from: who.name, company: who.company, category: categoryName(category), body: message, isReply: false, link: `${site}/admin/support/${ticket.id}` }),
    }),
    sendEmail({
      to: who.email,
      subject: `We got your request ${ref}: ${subject}`,
      html: ticketToCustomerEmail({ ref, subject, firstName: firstName(who.name), body: null, link: base ? `${site}${base}/support/${ticket.id}` : null }),
    }),
  ]);

  revalidatePath("/admin", "layout");
  if (base) revalidatePath(`${base}/support`);
  return { received: { ref, email: who.email, href: base ? `${base}/support/${ticket.id}` : null } };
}

/** Buyer/vendor adds to their own ticket; reopens it if it was answered or closed. */
export async function replyToTicket(_prev: SupportFormState, formData: FormData): Promise<SupportFormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Your session ended. Sign in again." };
  const id = text(formData, "ticket_id");
  const body = text(formData, "body");
  if (!body) return { fieldErrors: { body: "Write a reply first." } };
  if (body.length > MAX_MESSAGE) return { fieldErrors: { body: `Keep it under ${MAX_MESSAGE.toLocaleString()} characters.` } };

  const service = createServiceClient();
  const { data: ticket } = await service.from("tickets").select("*").eq("id", id).eq("user_id", viewer.id).maybeSingle<Ticket>();
  if (!ticket) return { error: "We couldn’t find that request." };

  const { error } = await service.from("ticket_messages").insert({ ticket_id: id, author_id: viewer.id, body });
  if (error) return { error: "Couldn’t send your reply. Try again." };
  await service.from("tickets").update({ status: "open", updated_at: new Date().toISOString() }).eq("id", id);

  const ref = ticketRef(ticket.number);
  await sendEmail({
    to: ADMIN_EMAIL,
    replyTo: ticket.email,
    subject: `Re: Support ${ref}: ${ticket.subject}`,
    html: ticketToStaffEmail({ ref, subject: ticket.subject, from: ticket.name, company: ticket.company, category: categoryName(ticket.category), body, isReply: true, link: `${await origin()}/admin/support/${id}` }),
  });

  refreshTicket(id);
  return { ok: "Sent." };
}

/** Spectra replies and/or changes the status. A reply emails the customer. */
export async function staffReply(_prev: SupportFormState, formData: FormData): Promise<SupportFormState> {
  const admin = await requireSuperAdmin();
  const id = text(formData, "ticket_id");
  const body = text(formData, "body");
  const status = text(formData, "status") as TicketStatus;
  if (!(status in TICKET_STATUSES)) return { error: "Choose a status." };
  if (body.length > MAX_MESSAGE) return { fieldErrors: { body: `Keep it under ${MAX_MESSAGE.toLocaleString()} characters.` } };

  const service = createServiceClient();
  const { data: ticket } = await service.from("tickets").select("*").eq("id", id).maybeSingle<Ticket>();
  if (!ticket) return { error: "Ticket not found." };
  if (!body && status === ticket.status) return { fieldErrors: { body: "Write a reply or change the status." } };

  if (body) {
    const { error } = await service.from("ticket_messages").insert({ ticket_id: id, author_id: admin.id, is_staff: true, body });
    if (error) return { error: "Couldn’t save the reply. Try again." };
  }
  await service.from("tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", id);

  let ok = `Marked ${TICKET_STATUSES[status].label.toLowerCase()}.`;
  if (body) {
    const ref = ticketRef(ticket.number);
    const { error } = await sendEmail({
      to: ticket.email,
      replyTo: ADMIN_EMAIL,
      subject: `Re: Support ${ref}: ${ticket.subject}`,
      html: ticketToCustomerEmail({ ref, subject: ticket.subject, firstName: firstName(ticket.name), body, link: await customerLink(ticket) }),
    });
    ok = error ? "Reply saved, but the email to the customer failed. It’s logged under Errors." : `Reply sent to ${ticket.email}.`;
  }

  refreshTicket(id);
  return { ok };
}
