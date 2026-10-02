import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Invoice } from "@/components/invoice";
import { requireSuperAdmin } from "@/lib/auth";
import { INVOICE_TEMPLATES } from "@/lib/invoice-templates";
import { SAMPLE_INVOICE } from "../../sample-invoice";

export const metadata: Metadata = { title: "Invoice preview · Spectra Admin" };

export default async function InvoicePreviewPage({ params }: PageProps<"/admin/tools/preview/[key]">) {
  await requireSuperAdmin();
  const { key } = await params;
  const template = INVOICE_TEMPLATES.find((t) => t.key === key);
  if (!template) notFound();

  return (
    <>
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4 print:hidden">
        <Link href="/admin/tools" className="text-sm text-ink-soft hover:text-sunset">
          &larr; Tools
        </Link>
        <p className="font-mono text-[11px] tracking-[0.16em] text-ink-soft uppercase">
          Preview &middot; {template.name} &middot; sample data
        </p>
      </div>
      <Invoice invoice={SAMPLE_INVOICE} template={template} />
    </>
  );
}
