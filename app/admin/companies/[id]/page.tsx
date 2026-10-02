import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ORDER_SELECT, OrderList, type OrderWithParties } from "@/components/orders";
import { LICENSE_BUCKET, LICENSE_DOCS, type LicenseDocKey } from "@/lib/access-requests";
import { categoryLabel, formatMoney, unitLabel } from "@/lib/catalog";
import { createServiceClient } from "@/lib/supabase/server";
import { IdentityForm, PauseControl } from "./company-controls";

export const metadata: Metadata = { title: "Company · Spectra Admin" };

const ROLE_LABELS: Record<string, string> = { buyer_admin: "Admin", seller_admin: "Admin", buyer: "Member", seller: "Member" };
const joined = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Anchorage" });

export default async function AdminCompanyPage({ params }: PageProps<"/admin/companies/[id]">) {
  const { id } = await params;
  const service = createServiceClient();

  const { data: company } = await service.from("companies").select("*").eq("id", id).maybeSingle();
  if (!company) notFound();
  const isVendor = company.type === "seller";

  const [{ data: team }, { data: products }, { data: orders }, { data: authUsers }] = await Promise.all([
    service.from("profiles").select("id, full_name, email, phone, role").eq("company_id", id).order("full_name"),
    isVendor
      ? service.from("products").select("id, name, category, price_per_unit, unit, stock_qty, is_active, is_archived").eq("seller_company_id", id).order("name")
      : Promise.resolve({ data: [] as never[] }),
    service
      .from("orders")
      .select(ORDER_SELECT)
      .or(`buyer_company_id.eq.${id},seller_company_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .limit(20),
    service.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const lastSignIn = new Map((authUsers?.users ?? []).map((u) => [u.id, u.last_sign_in_at]));

  const docPaths = (Object.keys(LICENSE_DOCS) as LicenseDocKey[]).map((k) => company[k]).filter(Boolean) as string[];
  const { data: signed } = docPaths.length
    ? await service.storage.from(LICENSE_BUCKET).createSignedUrls(docPaths, 60 * 10)
    : { data: [] };
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const address = [company.address, [company.city, company.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const live = (products ?? []).filter((p) => p.is_active && !p.is_archived);
  const total = ((orders ?? []) as OrderWithParties[]).filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.subtotal), 0);

  return (
    <>
      <Link href="/admin/companies" className="text-sm text-ink-soft hover:text-sunset">
        &larr; Companies
      </Link>
      <p className="mt-6 font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">
        {isVendor ? "Vendor" : "Buyer"} &middot; joined {joined.format(new Date(company.created_at))}
        {!company.is_active && <span className="text-danger"> &middot; paused</span>}
      </p>
      <h1 className="mt-2 font-display text-5xl font-light tracking-tight">{company.name}</h1>

      <div className="mt-12 grid gap-16 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-16">
          <Section title="Details">
            <dl className="divide-y divide-line border-y border-line">
              <Row label="Phone">{company.phone}</Row>
              <Row label="Order email">
                {company.email && (
                  <a href={`mailto:${company.email}`} className="underline decoration-line underline-offset-4 hover:text-sunset">
                    {company.email}
                  </a>
                )}
              </Row>
              <Row label="Address">{address}</Row>
              {!isVendor && <Row label="Receiving">{company.receiving_hours}</Row>}
              {!isVendor && <Row label="Instructions">{company.delivery_instructions}</Row>}
              <Row label="Documents">
                <span className="flex flex-wrap gap-x-4 gap-y-1">
                  {(Object.entries(LICENSE_DOCS) as [LicenseDocKey, string][]).map(([key, label]) => {
                    const href = company[key] && urlFor.get(company[key]);
                    return href ? (
                      <a key={key} href={href} target="_blank" rel="noreferrer" className="text-sunset underline underline-offset-4 hover:text-sunset-hover">
                        {label} &#8599;
                      </a>
                    ) : (
                      <span key={key} className="text-ink-soft">{label}: none</span>
                    );
                  })}
                </span>
              </Row>
            </dl>
          </Section>

          <Section title="Team">
            <ul className="divide-y divide-line border-y border-line">
              {(team ?? []).map((m) => {
                const seen = lastSignIn.get(m.id);
                return (
                  <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate">{m.full_name ?? m.email}</p>
                      <p className="truncate text-[13px] text-ink-soft">
                        <a href={`mailto:${m.email}`} className="hover:text-sunset">{m.email}</a>
                        {m.phone && ` · ${m.phone}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[10px] tracking-[0.14em] text-ink-soft uppercase">{ROLE_LABELS[m.role] ?? m.role}</p>
                      <p className="text-[12px] text-ink-soft">{seen ? `Last in ${joined.format(new Date(seen))}` : "Hasn’t signed in"}</p>
                    </div>
                  </li>
                );
              })}
              {!team?.length && <li className="py-3 text-ink-soft">No users.</li>}
            </ul>
          </Section>

          {isVendor && (
            <Section title={`Products · ${live.length} live of ${products?.length ?? 0}`}>
              {products?.length ? (
                <ul className="divide-y divide-line border-y border-line">
                  {products.map((p) => (
                    <li key={p.id} className="flex items-baseline justify-between gap-4 py-3 text-[14px]">
                      <span className="min-w-0 truncate">
                        {p.name}
                        <span className="text-ink-soft"> &middot; {categoryLabel(p.category)}</span>
                        {(!p.is_active || p.is_archived) && (
                          <span className="ml-2 font-mono text-[10px] tracking-[0.14em] text-ink-soft uppercase">{p.is_archived ? "Archived" : "Hidden"}</span>
                        )}
                      </span>
                      <span className="shrink-0 font-mono text-ink-soft">
                        {formatMoney(p.price_per_unit)}/{unitLabel(p.unit)} &middot; {p.stock_qty} in stock
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink-soft">No products listed yet.</p>
              )}
            </Section>
          )}

          <Section title={`Orders · ${formatMoney(total)}`}>
            <OrderList
              orders={(orders ?? []) as OrderWithParties[]}
              hrefBase="/admin/orders"
              counterparty="both"
              empty="No orders yet."
            />
          </Section>
        </div>

        <aside className="space-y-14">
          <Section title="Verified identity">
            <p className="-mt-3 mb-5 text-[13px] text-ink-soft">Only Spectra can change these. The company sees them as locked.</p>
            <IdentityForm id={company.id} name={company.name} license={company.license_number ?? ""} />
          </Section>
          <Section title="Access">
            <PauseControl id={company.id} name={company.name} active={company.is_active} isVendor={isVendor} />
          </Section>
        </aside>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-5 border-b border-ink pb-3 font-display text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-4 py-3 text-[14px]">
      <dt className="font-mono text-[11px] leading-6 tracking-[0.14em] text-ink-soft uppercase">{label}</dt>
      <dd>{children || <span className="text-ink-soft/60">Not provided</span>}</dd>
    </div>
  );
}
