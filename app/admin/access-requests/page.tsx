import type { Metadata } from "next";
import { LICENSE_BUCKET, LICENSE_DOCS, formatPhone, type LicenseDocKey } from "@/lib/access-requests";
import { createServiceClient } from "@/lib/supabase/server";
import { RequestActions } from "./request-actions";

export const metadata: Metadata = { title: "Access requests · Spectra Admin" };

type AccessRequest = {
  id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  account_type: "buyer" | "seller";
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  license_number: string;
  address: string | null;
  city: string | null;
  zip: string | null;
  receiving_hours: string | null;
  delivery_instructions: string | null;
  mj_license_path: string | null;
  biz_license_path: string | null;
  mj_license_url: string | null;
  biz_license_url: string | null;
  message: string | null;
};

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Anchorage" });

export default async function AccessRequestsPage() {
  const service = createServiceClient();
  const { data } = await service.from("access_requests").select("*").order("created_at", { ascending: false });
  const requests = (data ?? []) as AccessRequest[];

  // Short-lived links to the private license documents
  const paths = requests.flatMap((r) => [r.mj_license_path, r.biz_license_path]).filter((p): p is string => !!p);
  const { data: signed } = paths.length
    ? await service.storage.from(LICENSE_BUCKET).createSignedUrls(paths, 60 * 10)
    : { data: [] };
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const pending = requests.filter((r) => r.status === "pending");
  const reviewed = requests.filter((r) => r.status !== "pending");

  return (
    <>
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">Onboarding</p>
      <h1 className="mt-2 font-display text-5xl font-light tracking-tight">Access requests</h1>
      <p className="mt-3 text-ink-soft">
        Approving creates the company and login with everything below already filled in, then emails an invite.
      </p>

      <Group title="Waiting for review" count={pending.length} empty="Nothing waiting. New requests show up here.">
        {pending.map((r) => (
          <RequestRow key={r.id} request={r} urlFor={urlFor} />
        ))}
      </Group>

      {reviewed.length > 0 && (
        <Group title="Reviewed" count={reviewed.length}>
          {reviewed.map((r) => (
            <RequestRow key={r.id} request={r} urlFor={urlFor} />
          ))}
        </Group>
      )}
    </>
  );
}

function Group({ title, count, empty, children }: { title: string; count: number; empty?: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="flex items-baseline gap-3 border-b border-ink pb-3 font-display text-2xl">
        {title}
        <span className="font-mono text-sm text-ink-soft">{count}</span>
      </h2>
      {count === 0 && empty ? <p className="py-8 text-ink-soft">{empty}</p> : <div className="divide-y divide-line">{children}</div>}
    </section>
  );
}

function RequestRow({ request: r, urlFor }: { request: AccessRequest; urlFor: Map<string | null, string | null> }) {
  const name = r.first_name ? `${r.first_name} ${r.last_name ?? ""}`.trim() : r.full_name;
  const address = [r.address, [r.city, r.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const docs = (Object.entries(LICENSE_DOCS) as [LicenseDocKey, string][]).map(([key, label]) => {
    const legacyUrl = key === "mj_license_path" ? r.mj_license_url : r.biz_license_url;
    return { label, href: (r[key] && urlFor.get(r[key])) || legacyUrl };
  });

  return (
    <article className="grid gap-6 py-8 sm:grid-cols-[1fr_auto]">
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-display text-2xl">{r.company}</h3>
          <span className="font-mono text-[11px] tracking-[0.16em] text-ink-soft uppercase">
            {r.account_type === "seller" ? "Vendor" : "Buyer"} &middot; {dateFormat.format(new Date(r.created_at))}
          </span>
          {r.status !== "pending" && (
            <span className={`font-mono text-[11px] tracking-[0.16em] uppercase ${r.status === "approved" ? "text-success" : "text-danger"}`}>
              {r.status}
            </span>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-[8.5rem_1fr] gap-x-4 gap-y-2 text-[14px]">
          <Item label="Contact">{name}</Item>
          <Item label="Email">
            <a href={`mailto:${r.email}`} className="underline decoration-line underline-offset-4 hover:text-sunset">
              {r.email}
            </a>
          </Item>
          <Item label="Phone">{formatPhone(r.phone)}</Item>
          <Item label="License #">
            <span className="font-mono">{r.license_number}</span>
          </Item>
          <Item label="Address">{address || <Missing />}</Item>
          {r.account_type === "buyer" && (
            <>
              <Item label="Receiving">{r.receiving_hours ?? <Missing />}</Item>
              <Item label="Delivery notes">{r.delivery_instructions ?? <Missing />}</Item>
            </>
          )}
          <Item label="Documents">
            <span className="flex flex-wrap gap-x-4 gap-y-1">
              {docs.map((d) =>
                d.href ? (
                  <a key={d.label} href={d.href} target="_blank" rel="noreferrer" className="text-sunset underline underline-offset-4 hover:text-sunset-hover">
                    {d.label} &#8599;
                  </a>
                ) : (
                  <span key={d.label} className="text-ink-soft">{d.label}: missing</span>
                ),
              )}
            </span>
          </Item>
          {r.message && <Item label="Message">{r.message}</Item>}
        </dl>
      </div>

      <RequestActions id={r.id} status={r.status} company={r.company} />
    </article>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="font-mono text-[11px] leading-6 tracking-[0.14em] text-ink-soft uppercase">{label}</dt>
      <dd className="leading-6">{children}</dd>
    </>
  );
}

function Missing() {
  return <span className="text-ink-soft/60">Not provided</span>;
}
