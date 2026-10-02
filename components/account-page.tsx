import { CompanyForm, PasswordForm, ProfileForm } from "@/components/account-forms";
import { LICENSE_BUCKET, LICENSE_DOCS, type LicenseDocKey } from "@/lib/access-requests";
import type { Viewer } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

const ROLE_LABELS: Record<string, string> = {
  buyer_admin: "Admin",
  seller_admin: "Admin",
  buyer: "Member",
  seller: "Member",
};

// Shared by /buyer/account and /seller/account.
export async function AccountPage({ viewer }: { viewer: Viewer & { company: NonNullable<Viewer["company"]> } }) {
  const service = createServiceClient();
  const [{ data: profile }, { data: company }, { data: team }] = await Promise.all([
    service.from("profiles").select("first_name, last_name, full_name, phone, email").eq("id", viewer.id).single(),
    service.from("companies").select("*").eq("id", viewer.company.id).single(),
    service.from("profiles").select("id, full_name, email, role").eq("company_id", viewer.company.id).order("full_name"),
  ]);

  const isAdmin = viewer.role.endsWith("_admin");
  const isBuyer = viewer.company.type === "buyer";
  const [fallbackFirst, ...fallbackRest] = (profile?.full_name ?? "").split(" ");

  // Private license documents: short-lived links for this company's own users
  const docPaths = (Object.keys(LICENSE_DOCS) as LicenseDocKey[]).map((k) => company?.[k]).filter(Boolean) as string[];
  const { data: signed } = docPaths.length
    ? await service.storage.from(LICENSE_BUCKET).createSignedUrls(docPaths, 60 * 10)
    : { data: [] };
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const address = [company?.address, [company?.city, company?.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <>
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">Settings</p>
      <h1 className="mt-2 font-display text-5xl font-light tracking-tight">Account</h1>

      <div className="mt-12 grid gap-16 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-16">
          <Section title="Your profile">
            <ProfileForm
              profile={{
                first_name: profile?.first_name ?? fallbackFirst ?? "",
                last_name: profile?.last_name ?? fallbackRest.join(" "),
                phone: profile?.phone ?? "",
                email: profile?.email ?? viewer.email,
              }}
            />
          </Section>

          <Section
            title={company?.name ?? "Company"}
            note={
              isAdmin
                ? isBuyer
                  ? "Vendors see these on every order you place."
                  : "Buyers see these on your orders."
                : "Only your company’s admin can change these."
            }
          >
            {isAdmin ? (
              <CompanyForm
                isBuyer={isBuyer}
                company={{
                  phone: company?.phone ?? "",
                  email: company?.email ?? "",
                  address: company?.address ?? "",
                  city: company?.city ?? "",
                  zip: company?.zip ?? "",
                  receiving_hours: company?.receiving_hours ?? "",
                  delivery_instructions: company?.delivery_instructions ?? "",
                }}
              />
            ) : (
              <dl className="divide-y divide-line border-y border-line">
                <Row label="Phone">{company?.phone}</Row>
                <Row label="Order email">{company?.email}</Row>
                <Row label="Address">{address}</Row>
                {isBuyer && <Row label="Receiving">{company?.receiving_hours}</Row>}
                {isBuyer && <Row label="Instructions">{company?.delivery_instructions}</Row>}
              </dl>
            )}
          </Section>

          <Section title="Password">
            <PasswordForm />
          </Section>
        </div>

        <aside className="space-y-14">
          <Section title="License">
            <dl className="divide-y divide-line border-y border-line">
              <Row label="Business">{company?.name}</Row>
              <Row label="License #" mono>
                {company?.license_number}
              </Row>
              {(Object.keys(LICENSE_DOCS) as LicenseDocKey[]).map((key) => {
                const href = company?.[key] && urlFor.get(company[key]);
                return (
                  <Row key={key} label={key === "mj_license_path" ? "MJ license" : "Business lic."}>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer" className="text-sunset underline underline-offset-4 hover:text-sunset-hover">
                        View &#8599;
                      </a>
                    ) : (
                      <span className="text-ink-soft">Not on file</span>
                    )}
                  </Row>
                );
              })}
            </dl>
            <p className="mt-3 text-[13px] text-ink-soft">
              Business name and license are verified by Spectra. To update them, email{" "}
              <a href="mailto:info@spectrawholesale.com" className="underline underline-offset-4 hover:text-sunset">
                info@spectrawholesale.com
              </a>
              .
            </p>
          </Section>

          <Section title="Team">
            <ul className="divide-y divide-line border-y border-line">
              {(team ?? []).map((member) => (
                <li key={member.id} className="flex items-baseline justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px]">
                      {member.full_name ?? member.email}
                      {member.id === viewer.id && <span className="text-ink-soft"> (you)</span>}
                    </p>
                    <p className="truncate text-[13px] text-ink-soft">{member.email}</p>
                  </div>
                  <span className="font-mono text-[10px] tracking-[0.14em] text-ink-soft uppercase">
                    {ROLE_LABELS[member.role] ?? member.role}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </aside>
      </div>
    </>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-6 border-b border-ink pb-3">
        <h2 className="font-display text-2xl">{title}</h2>
        {note && <p className="mt-1 text-[13px] text-ink-soft">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 py-3 text-[14px]">
      <dt className="font-mono text-[11px] leading-6 tracking-[0.14em] text-ink-soft uppercase">{label}</dt>
      <dd className={mono ? "font-mono" : undefined}>{children || <span className="text-ink-soft/60">Not provided</span>}</dd>
    </div>
  );
}
