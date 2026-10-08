import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StaffReplyForm } from "@/components/support-forms";
import { StatusLabel, Thread } from "@/components/support-pages";
import { formatPhone } from "@/lib/access-requests";
import { requireSuperAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { TICKET_STATUSES, categoryName, ticketRef, type Ticket, type TicketMessage } from "@/lib/support";

export const metadata: Metadata = { title: "Support ticket · Spectra Admin" };

const when = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Anchorage" });

export default async function AdminTicketPage({ params }: PageProps<"/admin/support/[id]">) {
  // Checked here, not just in the layout: layouts don't stop a page from rendering.
  await requireSuperAdmin();
  const { id } = await params;
  const service = createServiceClient();

  const { data: ticket } = await service.from("tickets").select("*").eq("id", id).maybeSingle<Ticket>();
  if (!ticket) notFound();
  const [{ data: messages }, { data: errors }] = await Promise.all([
    service.from("ticket_messages").select("*").eq("ticket_id", id).order("created_at"),
    // Anything that broke for this person in the day before they wrote in
    ticket.user_id
      ? service
          .from("site_errors")
          .select("id, message, path, created_at")
          .eq("user_id", ticket.user_id)
          .gte("created_at", new Date(new Date(ticket.created_at).getTime() - 86_400_000).toISOString())
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as { id: string; message: string; path: string | null; created_at: string }[] }),
  ]);

  return (
    <>
      <Link href="/admin/support" className="text-sm text-ink-soft hover:text-sunset">
        &larr; Support
      </Link>
      <p className="mt-6 font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">
        {ticketRef(ticket.number)} &middot; {categoryName(ticket.category)}
      </p>
      <h1 className="mt-2 font-display text-4xl font-light tracking-tight">{ticket.subject}</h1>
      <p className="mt-3 text-[14px] text-ink-soft">
        <StatusLabel status={ticket.status} /> &middot; {TICKET_STATUSES[ticket.status].note}
      </p>

      <div className="mt-12 grid gap-16 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-12">
          <Thread messages={(messages ?? []) as TicketMessage[]} customerName={ticket.name} />
          <StaffReplyForm ticketId={ticket.id} status={ticket.status} />
        </div>

        <aside className="space-y-10">
          <section>
            <h2 className="mb-3 border-b border-ink pb-2 font-display text-xl">From</h2>
            <dl className="space-y-2 text-[14px]">
              <div>
                <dt className="sr-only">Name</dt>
                <dd>{ticket.name}</dd>
              </div>
              <div>
                <dt className="sr-only">Email</dt>
                <dd>
                  <a href={`mailto:${ticket.email}`} className="underline decoration-line underline-offset-4 hover:text-sunset">
                    {ticket.email}
                  </a>
                </dd>
              </div>
              {ticket.phone && (
                <div>
                  <dt className="sr-only">Phone</dt>
                  <dd>{formatPhone(ticket.phone)}</dd>
                </div>
              )}
              <div>
                <dt className="sr-only">Company</dt>
                <dd>
                  {ticket.company_id ? (
                    <Link href={`/admin/companies/${ticket.company_id}`} className="text-sunset underline underline-offset-4 hover:text-sunset-hover">
                      {ticket.company} &rarr;
                    </Link>
                  ) : (
                    <span className="text-ink-soft">{ticket.company ? `${ticket.company} (typed in, no account)` : "No account"}</span>
                  )}
                </dd>
              </div>
            </dl>
            <p className="mt-4 font-mono text-[11px] tracking-[0.14em] text-ink-soft uppercase">Opened {when.format(new Date(ticket.created_at))}</p>
          </section>

          {!!errors?.length && (
            <section>
              <h2 className="mb-3 border-b border-ink pb-2 font-display text-xl">Their recent errors</h2>
              <ul className="space-y-3 text-[13px]">
                {errors.map((e) => (
                  <li key={e.id}>
                    <p className="line-clamp-2 text-danger">{e.message}</p>
                    <p className="font-mono text-[11px] text-ink-soft">
                      {e.path} &middot; {when.format(new Date(e.created_at))}
                    </p>
                  </li>
                ))}
              </ul>
              <Link href="/admin/errors" className="mt-3 inline-block text-[13px] text-ink-soft underline underline-offset-4 hover:text-sunset">
                All errors &rarr;
              </Link>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
