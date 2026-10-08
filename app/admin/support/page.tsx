import type { Metadata } from "next";
import Link from "next/link";
import { StatusLabel } from "@/components/support-pages";
import { requireSuperAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { TICKET_STATUSES, categoryName, ticketRef, type Ticket, type TicketStatus } from "@/lib/support";

export const metadata: Metadata = { title: "Support · Spectra Admin" };

const when = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Anchorage" });

export default async function AdminSupportPage({ searchParams }: PageProps<"/admin/support">) {
  // Checked here, not just in the layout: layouts don't stop a page from rendering.
  await requireSuperAdmin();
  const { view: viewParam } = await searchParams;
  const view: TicketStatus = viewParam === "waiting" || viewParam === "closed" ? viewParam : "open";

  const { data } = await createServiceClient().from("tickets").select("*").order("updated_at", { ascending: false }).limit(500);
  const all = (data ?? []) as Ticket[];
  const tickets = all.filter((t) => t.status === view);

  return (
    <>
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">Spectra admin</p>
      <h1 className="mt-2 font-display text-5xl font-light tracking-tight">Support</h1>
      <p className="mt-3 text-ink-soft">Requests from buyers, vendors and the public form on the sign-in page. Replies are emailed to the customer.</p>

      <nav className="mt-10 flex items-baseline gap-6 border-b border-ink" aria-label="Ticket views">
        {(Object.keys(TICKET_STATUSES) as TicketStatus[]).map((key) => (
          <Link
            key={key}
            href={key === "open" ? "/admin/support" : `/admin/support?view=${key}`}
            aria-current={view === key ? "page" : undefined}
            className={`-mb-px flex items-baseline gap-2 border-b-2 pb-3 text-[15px] transition-colors ${
              view === key ? "border-sunset text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {key === "open" ? "Needs reply" : TICKET_STATUSES[key].label}
            <span className="font-mono text-xs text-ink-soft">{all.filter((t) => t.status === key).length}</span>
          </Link>
        ))}
      </nav>

      {tickets.length ? (
        <ul className="divide-y divide-line">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link href={`/admin/support/${t.id}`} className="group grid gap-x-6 gap-y-1 py-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto]">
                <span className="font-mono text-[13px] text-ink-soft">{ticketRef(t.number)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] group-hover:text-sunset">{t.subject}</span>
                  <span className="block truncate text-[13px] text-ink-soft">
                    {t.name}
                    {t.company && <> &middot; {t.company}</>}
                    {!t.user_id && <> &middot; public form</>} &middot; {categoryName(t.category)}
                  </span>
                </span>
                <span className="flex items-baseline gap-3 text-[13px] text-ink-soft sm:flex-col sm:items-end sm:gap-1">
                  <StatusLabel status={t.status} />
                  {when.format(new Date(t.updated_at))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-ink-soft">{view === "open" ? "All caught up. New requests show up here." : "Nothing here."}</p>
      )}
    </>
  );
}
