import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ORDER_SELECT, OrderList, type OrderWithParties } from "@/components/orders";
import { LICENSE_BUCKET, LICENSE_DOCS, type LicenseDocKey } from "@/lib/access-requests";
import { AUDIT_LABELS } from "@/lib/audit";
import { SUBSCRIPTION_STATUSES, alaskaToday, formatDate, type Payment, type Subscription } from "@/lib/billing";
import { categoryLabel, formatMoney, unitLabel } from "@/lib/catalog";
import { createServiceClient } from "@/lib/supabase/server";
import { CompanyDetailsForm, DeletePaymentButton, PaymentForm, SubscriptionForm, UserRow } from "./company-controls";
import { requireSuperAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Company · Spectra Admin" };

const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Anchorage" });
const dateOnly = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Anchorage" });

export default async function AdminCompanyPage({ params }: PageProps<"/admin/companies/[id]">) {
  // Checked here, not just in the layout: layouts don't stop a page from rendering.
  await requireSuperAdmin();
  const { id } = await params;
  const service = createServiceClient();

  const { data: company } = await service.from("companies").select("*").eq("id", id).maybeSingle();
  if (!company) notFound();
  const isVendor = company.type === "seller";

  const [{ data: team }, { data: products }, { data: orders }, { data: authUsers }, { data: sub }, { data: payments }, { data: activity }] =
    await Promise.all([
      service.from("profiles").select("id, first_name, last_name, full_name, email, phone, role").eq("company_id", id).order("full_name"),
      isVendor
        ? service.from("products").select("id, name, category, price_per_unit, unit, stock_qty, is_active, is_archived").eq("seller_company_id", id).order("name")
        : Promise.resolve({ data: [] as never[] }),
      service.from("orders").select(ORDER_SELECT).or(`buyer_company_id.eq.${id},seller_company_id.eq.${id}`).order("created_at", { ascending: false }).limit(20),
      service.auth.admin.listUsers({ perPage: 1000 }),
      service.from("vendor_billing").select("*").eq("company_id", id).maybeSingle(),
      service.from("billing_payments").select("*").eq("company_id", id).order("date", { ascending: false }),
      service.from("admin_audit_log").select("action, details, created_at, user_id").eq("company_id", id).order("created_at", { ascending: false }).limit(15),
    ]);

  const lastSignIn = new Map((authUsers?.users ?? []).map((u) => [u.id, u.last_sign_in_at]));
  const subscription = sub as Subscription | null;
  const paid = (payments ?? []) as Payment[];
  const collected = paid.reduce((s, p) => s + Number(p.amount), 0);
  const today = alaskaToday();

  const docPaths = (Object.keys(LICENSE_DOCS) as LicenseDocKey[]).map((k) => company[k]).filter(Boolean) as string[];
  const { data: signed } = docPaths.length ? await service.storage.from(LICENSE_BUCKET).createSignedUrls(docPaths, 60 * 10) : { data: [] };
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const live = (products ?? []).filter((p) => p.is_active && !p.is_archived);
  const sales = ((orders ?? []) as OrderWithParties[]).filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);
  const status = subscription?.status;

  return (
    <>
      <Link href="/admin/companies" className="text-sm text-ink-soft hover:text-sunset">
        &larr; Companies
      </Link>
      <p className="mt-6 font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">
        {isVendor ? "Vendor" : "Buyer"} &middot; joined {dateOnly.format(new Date(company.created_at))}
        {status && <span className={SUBSCRIPTION_STATUSES[status].tone}> &middot; {SUBSCRIPTION_STATUSES[status].label}</span>}
      </p>
      <h1 className="mt-2 font-display text-5xl font-light tracking-tight">{company.name}</h1>

      <div className="mt-12 grid gap-16 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-16">
          <Section title="Company" note="You can edit everything here, including the business name and license the company sees as locked.">
            <CompanyDetailsForm
              id={company.id}
              isBuyer={!isVendor}
              company={{
                name: company.name ?? "",
                license_number: company.license_number ?? "",
                phone: company.phone ?? "",
                email: company.email ?? "",
                address: company.address ?? "",
                city: company.city ?? "",
                zip: company.zip ?? "",
                receiving_hours: company.receiving_hours ?? "",
                delivery_instructions: company.delivery_instructions ?? "",
              }}
            />
            <p className="mt-6 text-[14px]">
              <span className="font-mono text-[11px] tracking-[0.14em] text-ink-soft uppercase">Documents </span>
              {(Object.entries(LICENSE_DOCS) as [LicenseDocKey, string][]).map(([key, label]) => {
                const href = company[key] && urlFor.get(company[key]);
                return href ? (
                  <a key={key} href={href} target="_blank" rel="noreferrer" className="mr-4 text-sunset underline underline-offset-4 hover:text-sunset-hover">
                    {label} &#8599;
                  </a>
                ) : (
                  <span key={key} className="mr-4 text-ink-soft">{label}: none</span>
                );
              })}
            </p>
          </Section>

          <Section title="Users" note="Change names, login emails and who's the admin, send a password reset, or view the app as them.">
            <ul className="divide-y divide-line border-y border-line">
              {(team ?? []).map((m) => {
                const [first, ...rest] = (m.full_name ?? "").split(" ");
                const seen = lastSignIn.get(m.id);
                return (
                  <UserRow
                    key={m.id}
                    lastSeen={seen ? `last in ${dateOnly.format(new Date(seen))}` : "hasn’t signed in"}
                    user={{
                      id: m.id,
                      first_name: m.first_name ?? first ?? "",
                      last_name: m.last_name ?? rest.join(" "),
                      phone: m.phone ?? "",
                      email: m.email,
                      isAdmin: m.role.endsWith("_admin"),
                    }}
                  />
                );
              })}
              {!team?.length && <li className="py-4 text-ink-soft">No users.</li>}
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

          <Section title={`Orders · ${formatMoney(sales)}`}>
            <OrderList orders={(orders ?? []) as OrderWithParties[]} hrefBase="/admin/orders" counterparty="both" empty="No orders yet." />
          </Section>

          <Section title="Admin activity">
            {activity?.length ? (
              <ul className="divide-y divide-line border-y border-line text-[14px]">
                {activity.map((a, i) => {
                  const d = a.details as Record<string, unknown>;
                  const who = typeof d.name === "string" ? d.name : "";
                  const extra =
                    a.action === "payment_recorded" || a.action === "payment_deleted"
                      ? formatMoney(Number(d.amount))
                      : a.action === "subscription_update"
                        ? `${SUBSCRIPTION_STATUSES[d.status as keyof typeof SUBSCRIPTION_STATUSES]?.label ?? d.status}${d.monthly_price != null ? ` · ${formatMoney(Number(d.monthly_price))}/mo` : ""}`
                        : a.action === "view_as_end" && typeof d.minutes === "number"
                          ? `${who} · ${d.minutes} min`
                          : who;
                  return (
                    <li key={i} className="flex items-baseline justify-between gap-4 py-2.5">
                      <span>
                        {AUDIT_LABELS[a.action] ?? a.action}
                        {extra && <span className="text-ink-soft"> &middot; {extra}</span>}
                      </span>
                      <span className="shrink-0 text-[12px] text-ink-soft">{dateTime.format(new Date(a.created_at))}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-ink-soft">No admin changes yet.</p>
            )}
          </Section>
        </div>

        <aside className="space-y-14">
          <Section title="Subscription">
            {!subscription && <p className="mb-4 text-[13px] text-pending">No subscription record yet. Saving creates one.</p>}
            <SubscriptionForm
              companyId={company.id}
              sub={{
                status: subscription?.status ?? "trial",
                monthly_price: subscription?.monthly_price != null ? String(subscription.monthly_price) : "",
                trial_ends_on: subscription?.trial_ends_on ?? "",
                next_due_date: subscription?.next_due_date ?? "",
                notes: subscription?.notes ?? "",
              }}
            />
          </Section>

          <Section title={`Payments · ${formatMoney(collected)}`}>
            <PaymentForm
              companyId={company.id}
              today={today}
              suggested={subscription?.monthly_price != null ? String(subscription.monthly_price) : ""}
            />
            {paid.length > 0 && (
              <ul className="mt-8 divide-y divide-line border-y border-line text-[14px]">
                {paid.map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block font-mono">{formatMoney(p.amount)}</span>
                      <span className="block truncate text-[12px] text-ink-soft">
                        {formatDate(p.date)}
                        {p.method && ` · ${p.method}`}
                        {p.note && ` · ${p.note}`}
                      </span>
                    </span>
                    <DeletePaymentButton id={p.id} label={`${formatMoney(p.amount)} on ${formatDate(p.date)}`} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </aside>
      </div>
    </>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-5 border-b border-ink pb-3">
        <h2 className="font-display text-2xl">{title}</h2>
        {note && <p className="mt-1 text-[13px] text-ink-soft">{note}</p>}
      </div>
      {children}
    </section>
  );
}
