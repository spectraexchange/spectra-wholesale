import type { Metadata } from "next";
import Link from "next/link";
import { SUBSCRIPTION_STATUSES, addDays, alaskaToday, formatDate, type Payment, type Subscription, type SubscriptionStatus } from "@/lib/billing";
import { formatMoney } from "@/lib/catalog";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Billing · Spectra Admin" };

type Row = Subscription & { company: { id: string; name: string; type: string } };

export default async function AdminBillingPage({ searchParams }: PageProps<"/admin/billing">) {
  // Checked here, not just in the layout: layouts don't stop a page from rendering.
  await requireSuperAdmin();
  const { status: statusParam } = await searchParams;
  const filter = typeof statusParam === "string" && statusParam in SUBSCRIPTION_STATUSES ? (statusParam as SubscriptionStatus) : null;

  const service = createServiceClient();
  const [{ data: subs, error }, { data: payments }, { data: companies }] = await Promise.all([
    service.from("vendor_billing").select("*, company:companies!inner(id, name, type)"),
    service.from("billing_payments").select("*, company:companies(id, name)").order("date", { ascending: false }),
    service.from("companies").select("id, name, type"),
  ]);

  if (error) {
    return (
      <>
        <h1 className="font-display text-5xl font-light tracking-tight">Billing</h1>
        <p className="mt-6 text-danger">Billing isn&rsquo;t set up in the database yet. Run the billing migration (20261005).</p>
      </>
    );
  }

  const rows = ((subs ?? []) as unknown as Row[]).sort((a, b) => a.company.name.localeCompare(b.company.name));
  const paid = (payments ?? []) as (Payment & { company: { id: string; name: string } | null })[];
  const today = alaskaToday();
  const monthPrefix = today.slice(0, 7);
  const yearPrefix = today.slice(0, 4);

  const billable = rows.filter((r) => r.status === "active" || r.status === "past_due");
  const mrr = billable.reduce((s, r) => s + Number(r.monthly_price ?? 0), 0);
  const thisMonth = paid.filter((p) => p.date.startsWith(monthPrefix)).reduce((s, p) => s + Number(p.amount), 0);
  const thisYear = paid.filter((p) => p.date.startsWith(yearPrefix)).reduce((s, p) => s + Number(p.amount), 0);
  const counts = Object.fromEntries(
    (Object.keys(SUBSCRIPTION_STATUSES) as SubscriptionStatus[]).map((s) => [s, rows.filter((r) => r.status === s).length]),
  ) as Record<SubscriptionStatus, number>;

  const lastPaid = new Map<string, Payment>();
  const totalPaid = new Map<string, number>();
  for (const p of paid) {
    if (!lastPaid.has(p.company_id)) lastPaid.set(p.company_id, p);
    totalPaid.set(p.company_id, (totalPaid.get(p.company_id) ?? 0) + Number(p.amount));
  }

  // Needs attention
  const overdue = billable.filter((r) => r.next_due_date && r.next_due_date < today);
  const trialsEnding = rows.filter((r) => r.status === "trial" && r.trial_ends_on && r.trial_ends_on >= today && r.trial_ends_on <= addDays(today, 14));
  const trialsExpired = rows.filter((r) => r.status === "trial" && r.trial_ends_on && r.trial_ends_on < today);
  const unpriced = billable.filter((r) => r.monthly_price == null);
  const missing = (companies ?? []).filter((c) => !rows.some((r) => r.company_id === c.id));

  const attention = [
    ...overdue.map((r) => ({ r, text: `Payment due ${formatDate(r.next_due_date!)}`, tone: "text-danger" })),
    ...trialsExpired.map((r) => ({ r, text: `Trial ended ${formatDate(r.trial_ends_on!)}`, tone: "text-pending" })),
    ...trialsEnding.map((r) => ({ r, text: `Trial ends ${formatDate(r.trial_ends_on!)}`, tone: "text-info" })),
    ...unpriced.map((r) => ({ r, text: "Active with no monthly price", tone: "text-pending" })),
  ];

  const shown = filter ? rows.filter((r) => r.status === filter) : rows;

  return (
    <>
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">Spectra admin</p>
      <h1 className="mt-2 font-display text-5xl font-light tracking-tight">Billing</h1>

      <dl className="mt-10 grid grid-cols-2 border-y border-ink lg:grid-cols-4">
        {[
          { label: "Monthly recurring", value: formatMoney(mrr), detail: `${billable.length} paying ${billable.length === 1 ? "account" : "accounts"}` },
          { label: "Collected this month", value: formatMoney(thisMonth) },
          { label: `Collected in ${yearPrefix}`, value: formatMoney(thisYear) },
          { label: "On trial", value: String(counts.trial), detail: trialsEnding.length ? `${trialsEnding.length} ending in 2 weeks` : undefined },
        ].map((s, i) => (
          <div key={s.label} className={`border-line py-6 ${i % 2 ? "border-l pl-5" : "pr-4"} lg:border-l lg:pl-5 lg:first:border-l-0 lg:first:pl-0`}>
            <dt className="font-mono text-[10px] tracking-[0.16em] text-ink-soft uppercase">{s.label}</dt>
            <dd className="mt-2 font-display text-4xl font-light">{s.value}</dd>
            {s.detail && <dd className="mt-1 text-[13px] text-ink-soft">{s.detail}</dd>}
          </div>
        ))}
      </dl>

      {(attention.length > 0 || missing.length > 0) && (
        <section className="mt-14">
          <h2 className="border-b border-ink pb-3 font-display text-2xl">Needs attention</h2>
          <ul className="divide-y divide-line">
            {attention.map(({ r, text, tone }, i) => (
              <li key={`${r.id}-${i}`}>
                <Link href={`/admin/companies/${r.company_id}`} className="group flex items-baseline justify-between gap-4 py-3">
                  <span className="group-hover:text-sunset">{r.company.name}</span>
                  <span className={`text-[14px] ${tone}`}>{text}</span>
                </Link>
              </li>
            ))}
            {missing.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/companies/${c.id}`} className="group flex items-baseline justify-between gap-4 py-3">
                  <span className="group-hover:text-sunset">{c.name}</span>
                  <span className="text-[14px] text-pending">No subscription record</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14">
        <nav className="flex flex-wrap gap-6 border-b border-ink" aria-label="Subscription status">
          {[{ key: null, label: "All", count: rows.length }, ...(Object.entries(SUBSCRIPTION_STATUSES) as [SubscriptionStatus, { label: string }][]).map(([key, s]) => ({ key, label: s.label, count: counts[key] }))].map((t) => (
            <Link
              key={t.label}
              href={t.key ? `/admin/billing?status=${t.key}` : "/admin/billing"}
              aria-current={filter === t.key ? "page" : undefined}
              className={`-mb-px flex items-baseline gap-2 border-b-2 pb-3 text-[15px] transition-colors ${
                filter === t.key ? "border-sunset text-ink" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
              <span className="font-mono text-xs text-ink-soft">{t.count}</span>
            </Link>
          ))}
        </nav>

        {shown.length === 0 ? (
          <p className="py-12 text-ink-soft">No accounts here.</p>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((r) => {
              const s = SUBSCRIPTION_STATUSES[r.status];
              const late = (r.status === "active" || r.status === "past_due") && r.next_due_date && r.next_due_date < today;
              const last = lastPaid.get(r.company_id);
              return (
                <li key={r.id}>
                  <Link
                    href={`/admin/companies/${r.company_id}`}
                    className="group grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1 py-4 sm:grid-cols-[minmax(0,1fr)_7rem_8rem_9rem_8rem]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-display text-lg group-hover:text-sunset">{r.company.name}</span>
                      <span className="block text-[13px] text-ink-soft">{r.company.type === "seller" ? "Vendor" : "Buyer"}</span>
                    </span>
                    <span className={`font-mono text-[11px] tracking-[0.14em] uppercase ${s.tone}`}>{s.label}</span>
                    <span className="hidden font-mono text-[15px] sm:block">
                      {r.monthly_price != null ? `${formatMoney(Number(r.monthly_price))}/mo` : <span className="text-ink-soft">No price</span>}
                    </span>
                    <span className={`hidden text-[13px] sm:block ${late ? "text-danger" : "text-ink-soft"}`}>
                      {r.status === "trial"
                        ? r.trial_ends_on ? `Trial to ${formatDate(r.trial_ends_on)}` : "Trial, no end set"
                        : r.next_due_date ? `${late ? "Overdue" : "Due"} ${formatDate(r.next_due_date)}` : "No due date"}
                    </span>
                    <span className="hidden text-right text-[13px] text-ink-soft sm:block">
                      {last ? (
                        <>
                          <span className="block font-mono text-ink">{formatMoney(totalPaid.get(r.company_id) ?? 0)}</span>
                          last {formatDate(last.date)}
                        </>
                      ) : (
                        "No payments"
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-14">
        <h2 className="border-b border-ink pb-3 font-display text-2xl">Recent payments</h2>
        {paid.length === 0 ? (
          <p className="py-8 text-ink-soft">No payments recorded yet. Record them from each company&rsquo;s page.</p>
        ) : (
          <ul className="divide-y divide-line">
            {paid.slice(0, 25).map((p) => (
              <li key={p.id} className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-baseline gap-4 py-3 text-[14px]">
                <span className="text-ink-soft">{formatDate(p.date)}</span>
                <span className="min-w-0 truncate">
                  {p.company ? (
                    <Link href={`/admin/companies/${p.company.id}`} className="hover:text-sunset">{p.company.name}</Link>
                  ) : (
                    "Deleted company"
                  )}
                  <span className="text-ink-soft">
                    {p.method && ` · ${p.method}`}
                    {p.note && ` · ${p.note}`}
                  </span>
                </span>
                <span className="font-mono">{formatMoney(Number(p.amount))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
