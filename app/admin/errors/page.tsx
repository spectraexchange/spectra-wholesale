import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { daysAgo } from "@/lib/error-log";
import { createServiceClient } from "@/lib/supabase/server";
import { ResolveButton } from "./resolve-button";

export const metadata: Metadata = { title: "Errors · Spectra Admin" };

const DAYS = 30;
const when = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Anchorage" });

const SOURCES = {
  server: "Server",
  browser: "Browser",
  email: "Email",
} as const;

type ErrorRow = {
  id: string;
  created_at: string;
  source: keyof typeof SOURCES;
  message: string;
  detail: string | null;
  route: string | null;
  path: string | null;
  digest: string | null;
  fingerprint: string;
  user_id: string | null;
  user_agent: string | null;
  resolved_at: string | null;
};

type Group = { fingerprint: string; latest: ErrorRow; rows: ErrorRow[]; open: number; users: Set<string> };

export default async function AdminErrorsPage({ searchParams }: PageProps<"/admin/errors">) {
  // Checked here, not just in the layout: layouts don't stop a page from rendering.
  await requireSuperAdmin();
  const { view: viewParam } = await searchParams;
  const view = viewParam === "resolved" ? "resolved" : "open";
  const service = createServiceClient();

  const since = daysAgo(DAYS);
  const { data } = await service.from("site_errors").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(3000);
  const rows = (data ?? []) as ErrorRow[];

  // Newest first, so the first row seen for a fingerprint is its latest occurrence
  const groups = new Map<string, Group>();
  for (const row of rows) {
    const group = groups.get(row.fingerprint) ?? { fingerprint: row.fingerprint, latest: row, rows: [], open: 0, users: new Set<string>() };
    group.rows.push(row);
    if (!row.resolved_at) group.open++;
    if (row.user_id) group.users.add(row.user_id);
    groups.set(row.fingerprint, group);
  }
  const all = [...groups.values()];
  const shown = all.filter((g) => (view === "open" ? g.open > 0 : g.open === 0));

  const userIds = [...new Set(shown.flatMap((g) => [...g.users]))];
  const { data: people } = userIds.length
    ? await service.from("profiles").select("id, full_name, email, company_id, companies(name)").in("id", userIds)
    : { data: [] };
  const nameFor = new Map(
    (people ?? []).map((p) => {
      const company = Array.isArray(p.companies) ? p.companies[0] : p.companies;
      return [p.id, { name: p.full_name || p.email, company: (company as { name?: string } | null)?.name, companyId: p.company_id }];
    }),
  );

  return (
    <>
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">Spectra admin</p>
      <h1 className="mt-2 font-display text-5xl font-light tracking-tight">Errors</h1>
      <p className="mt-3 max-w-3xl text-ink-soft">
        Crashes on the server or in someone&rsquo;s browser, plus emails that failed to send, from the last {DAYS} days. Repeats of the same
        error are grouped. Resolving one hides it until it happens again.
      </p>

      <nav className="mt-10 flex items-baseline gap-6 border-b border-ink" aria-label="Error views">
        {(["open", "resolved"] as const).map((key) => (
          <Link
            key={key}
            href={key === "open" ? "/admin/errors" : "/admin/errors?view=resolved"}
            aria-current={view === key ? "page" : undefined}
            className={`-mb-px flex items-baseline gap-2 border-b-2 pb-3 text-[15px] transition-colors ${
              view === key ? "border-sunset text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {key === "open" ? "Open" : "Resolved"}
            <span className="font-mono text-xs text-ink-soft">{all.filter((g) => (key === "open" ? g.open > 0 : g.open === 0)).length}</span>
          </Link>
        ))}
      </nav>

      {shown.length ? (
        <ul className="divide-y divide-line">
          {shown.map((g) => {
            const e = g.latest;
            const count = view === "open" ? g.open : g.rows.length;
            return (
              <li key={g.fingerprint} className="py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] tracking-[0.14em] text-ink-soft uppercase">
                      <span className={e.source === "email" ? "text-amber" : "text-danger"}>{SOURCES[e.source]}</span>
                      {e.route && <> &middot; <span className="normal-case tracking-normal">{e.route}</span></>}
                    </p>
                    <p className="mt-1 text-[15px] break-words">{e.message}</p>
                    <p className="mt-1 text-[13px] text-ink-soft">
                      {count} time{count === 1 ? "" : "s"}
                      {g.users.size > 0 && <> &middot; {g.users.size} {g.users.size === 1 ? "person" : "people"}</>} &middot; last{" "}
                      {when.format(new Date(e.created_at))}
                      {g.rows.length > 1 && <> &middot; first {when.format(new Date(g.rows[g.rows.length - 1].created_at))}</>}
                    </p>
                  </div>
                  {view === "open" && <ResolveButton fingerprint={g.fingerprint} />}
                </div>

                <details className="group mt-3">
                  <summary className="cursor-pointer text-[13px] text-ink-soft select-none hover:text-sunset">Details</summary>
                  <div className="mt-3 space-y-4">
                    {e.detail && (
                      <pre className="max-h-80 overflow-auto rounded-[3px] border border-line bg-field p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
                        {e.detail}
                      </pre>
                    )}
                    <table className="w-full text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-line font-mono text-[10px] tracking-[0.14em] text-ink-soft uppercase">
                          <th className="py-1.5 pr-4 font-normal">When</th>
                          <th className="py-1.5 pr-4 font-normal">Page</th>
                          <th className="py-1.5 pr-4 font-normal">Who</th>
                          <th className="py-1.5 font-normal">Error ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {g.rows.slice(0, 10).map((r) => {
                          const who = r.user_id ? nameFor.get(r.user_id) : null;
                          return (
                            <tr key={r.id} className="align-baseline">
                              <td className="py-1.5 pr-4 whitespace-nowrap">{when.format(new Date(r.created_at))}</td>
                              <td className="max-w-64 truncate py-1.5 pr-4 font-mono text-[12px]">{r.path ?? "—"}</td>
                              <td className="py-1.5 pr-4">
                                {who ? (
                                  who.companyId ? (
                                    <Link href={`/admin/companies/${who.companyId}`} className="underline decoration-line underline-offset-4 hover:text-sunset">
                                      {who.name}
                                      {who.company && <span className="text-ink-soft"> · {who.company}</span>}
                                    </Link>
                                  ) : (
                                    who.name
                                  )
                                ) : (
                                  <span className="text-ink-soft">Signed out / unknown</span>
                                )}
                              </td>
                              <td className="py-1.5 font-mono text-[12px] text-ink-soft">{r.digest ?? "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {g.rows.length > 10 && <p className="text-[12px] text-ink-soft">Showing the latest 10 of {g.rows.length}.</p>}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-8 text-ink-soft">{view === "open" ? "No open errors. Nice." : "Nothing resolved in the last 30 days."}</p>
      )}
    </>
  );
}
