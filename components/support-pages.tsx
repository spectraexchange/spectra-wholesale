import Link from "next/link";
import { notFound } from "next/navigation";
import { NewTicketForm, ReplyForm } from "@/components/support-forms";
import type { Viewer } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { TICKET_STATUSES, categoryName, ticketRef, type Ticket, type TicketMessage } from "@/lib/support";

type CompanyViewer = Viewer & { company: NonNullable<Viewer["company"]> };

const when = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Anchorage" });

// Shared by /buyer/support and /seller/support.
export async function SupportList({ viewer, base }: { viewer: CompanyViewer; base: string }) {
  const { data } = await createServiceClient().from("tickets").select("*").eq("user_id", viewer.id).order("updated_at", { ascending: false });
  const tickets = (data ?? []) as Ticket[];

  return (
    <>
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">Help</p>
      <h1 className="mt-2 font-display text-5xl font-light tracking-tight">Support</h1>

      <div className="mt-12 grid gap-16 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section>
          <div className="mb-6 border-b border-ink pb-3">
            <h2 className="font-display text-2xl">Ask Spectra</h2>
            <p className="mt-1 text-[13px] text-ink-soft">We usually reply within one business day, here and by email.</p>
          </div>
          <NewTicketForm />
        </section>

        <aside>
          <div className="mb-6 border-b border-ink pb-3">
            <h2 className="font-display text-2xl">Your requests</h2>
          </div>
          {tickets.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {tickets.map((t) => (
                <li key={t.id}>
                  <Link href={`${base}/support/${t.id}`} className="group block py-3">
                    <p className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[15px] group-hover:text-sunset">{t.subject}</span>
                      <StatusLabel status={t.status} />
                    </p>
                    <p className="mt-0.5 font-mono text-[12px] text-ink-soft">
                      {ticketRef(t.number)} &middot; {when.format(new Date(t.updated_at))}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-soft">Nothing yet. Requests you send show up here with our replies.</p>
          )}
        </aside>
      </div>
    </>
  );
}

export async function SupportTicket({ viewer, base, id }: { viewer: CompanyViewer; base: string; id: string }) {
  const service = createServiceClient();
  const { data: ticket } = await service.from("tickets").select("*").eq("id", id).eq("user_id", viewer.id).maybeSingle<Ticket>();
  if (!ticket) notFound();
  const { data: messages } = await service.from("ticket_messages").select("*").eq("ticket_id", id).order("created_at");

  return (
    <div className="max-w-3xl">
      <Link href={`${base}/support`} className="text-sm text-ink-soft hover:text-sunset">
        &larr; Support
      </Link>
      <p className="mt-6 font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">
        {ticketRef(ticket.number)} &middot; {categoryName(ticket.category)}
      </p>
      <h1 className="mt-2 font-display text-4xl font-light tracking-tight">{ticket.subject}</h1>
      <p className="mt-3 text-[14px] text-ink-soft">
        <StatusLabel status={ticket.status} /> &middot; {TICKET_STATUSES[ticket.status].note}
      </p>

      <div className="mt-10">
        <Thread messages={(messages ?? []) as TicketMessage[]} customerName="You" />
      </div>
      <div className="mt-10">
        <ReplyForm ticketId={ticket.id} closed={ticket.status === "closed"} />
      </div>
    </div>
  );
}

export function Thread({ messages, customerName }: { messages: TicketMessage[]; customerName: string }) {
  return (
    <ol className="space-y-6">
      {messages.map((m) => (
        <li key={m.id} className={`border-l-[3px] py-1 pl-4 ${m.is_staff ? "border-teal" : "border-line"}`}>
          <p className="font-mono text-[11px] tracking-[0.14em] text-ink-soft uppercase">
            {m.is_staff ? "Spectra support" : customerName} &middot; {when.format(new Date(m.created_at))}
          </p>
          <p className="mt-1.5 text-[15px] whitespace-pre-wrap">{m.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function StatusLabel({ status }: { status: Ticket["status"] }) {
  const tone = status === "open" ? "text-sunset" : status === "waiting" ? "text-success" : "text-ink-soft";
  return <span className={`shrink-0 font-mono text-[10px] tracking-[0.14em] uppercase ${tone}`}>{TICKET_STATUSES[status].label}</span>;
}
