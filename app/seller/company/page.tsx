import type { Metadata } from "next";
import { LICENSE_BUCKET, LICENSE_DOCS, type LicenseDocKey } from "@/lib/access-requests";
import { requireSeller } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Company · Spectra Wholesale" };

const ROLE_LABELS: Record<string, string> = { seller_admin: "Admin", seller: "Member" };

export default async function CompanyPage() {
  const { company: viewerCompany } = await requireSeller();
  const service = createServiceClient();

  const [{ data: company }, { data: team }] = await Promise.all([
    service.from("companies").select("*").eq("id", viewerCompany.id).single(),
    service.from("profiles").select("id, full_name, email, phone, role").eq("company_id", viewerCompany.id).order("full_name"),
  ]);

  // Private license docs: short-lived links for this company's own users
  const docPaths = (Object.keys(LICENSE_DOCS) as LicenseDocKey[]).map((k) => company?.[k]).filter(Boolean) as string[];
  const { data: signed } = docPaths.length
    ? await service.storage.from(LICENSE_BUCKET).createSignedUrls(docPaths, 60 * 10)
    : { data: [] };
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const address = [company?.address, [company?.city, company?.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <>
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">Company</p>
      <h1 className="mt-2 font-display text-5xl font-light tracking-tight">{company?.name}</h1>
      <p className="mt-3 text-ink-soft">
        This is what buyers see about you. To change it, email{" "}
        <a href="mailto:info@spectrawholesale.com" className="text-ink underline decoration-sunset decoration-2 underline-offset-4 hover:text-sunset">
          info@spectrawholesale.com
        </a>
        .
      </p>

      <div className="mt-12 grid gap-14 lg:grid-cols-2">
        <section>
          <h2 className="border-b border-ink pb-3 font-display text-2xl">Details</h2>
          <dl className="divide-y divide-line">
            <Row label="License #" mono>{company?.license_number}</Row>
            <Row label="Address">{address}</Row>
            <Row label="Phone">{company?.phone}</Row>
            <Row label="Email">{company?.email}</Row>
            <Row label="Documents">
              <span className="flex flex-col gap-1">
                {(Object.entries(LICENSE_DOCS) as [LicenseDocKey, string][]).map(([key, label]) => {
                  const href = company?.[key] && urlFor.get(company[key]);
                  return href ? (
                    <a key={key} href={href} target="_blank" rel="noreferrer" className="text-sunset underline underline-offset-4 hover:text-sunset-hover">
                      {label} &#8599;
                    </a>
                  ) : (
                    <span key={key} className="text-ink-soft">{label}: not on file</span>
                  );
                })}
              </span>
            </Row>
          </dl>
        </section>

        <section>
          <h2 className="border-b border-ink pb-3 font-display text-2xl">Team</h2>
          <ul className="divide-y divide-line">
            {(team ?? []).map((member) => (
              <li key={member.id} className="flex items-baseline justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="truncate">{member.full_name ?? member.email}</p>
                  <p className="truncate text-[13px] text-ink-soft">
                    {member.email}
                    {member.phone && ` · ${member.phone}`}
                  </p>
                </div>
                <span className="font-mono text-[11px] tracking-[0.14em] text-ink-soft uppercase">
                  {ROLE_LABELS[member.role] ?? member.role}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function Row({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-4 py-4 text-[15px]">
      <dt className="font-mono text-[11px] leading-6 tracking-[0.14em] text-ink-soft uppercase">{label}</dt>
      <dd className={mono ? "font-mono" : undefined}>{children || <span className="text-ink-soft/60">Not provided</span>}</dd>
    </div>
  );
}
