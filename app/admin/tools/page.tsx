import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/auth";
import { INVOICE_TEMPLATES, getActiveTemplate } from "@/lib/invoice-templates";
import { TemplatePicker } from "./template-picker";

export const metadata: Metadata = { title: "Tools · Spectra Admin" };

export default async function AdminToolsPage() {
  await requireSuperAdmin();
  const active = await getActiveTemplate();

  return (
    <>
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">Platform</p>
      <h1 className="mt-2 font-display text-5xl font-light tracking-tight">Tools</h1>

      <section className="mt-12 max-w-3xl">
        <div className="mb-6 border-b border-ink pb-3">
          <h2 className="font-display text-2xl">Invoice design</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Switches every invoice on Spectra at once, past orders included. Vendor logos, terms and payment details stay
            as each vendor set them.
          </p>
        </div>
        <TemplatePicker templates={INVOICE_TEMPLATES} active={active.key} />
      </section>
    </>
  );
}
