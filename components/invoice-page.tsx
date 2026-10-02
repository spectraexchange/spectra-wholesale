import Link from "next/link";
import { notFound } from "next/navigation";
import { INVOICE_SELECT, Invoice, type InvoiceData } from "@/components/invoice";
import { PrintButton } from "@/components/print-button";
import { getActiveTemplate } from "@/lib/invoice-templates";
import { createServiceClient } from "@/lib/supabase/server";

// Shared by the buyer, vendor and admin invoice routes. `scope` limits the
// lookup to the viewer's own company (the service client bypasses RLS).
export async function InvoicePage({
  orderId,
  scope,
  backHref,
}: {
  orderId: string;
  scope: { column: "buyer_company_id" | "seller_company_id"; companyId: string } | null;
  backHref: string;
}) {
  let query = createServiceClient().from("orders").select(INVOICE_SELECT).eq("id", orderId);
  if (scope) query = query.eq(scope.column, scope.companyId);
  const [{ data }, template] = await Promise.all([query.maybeSingle(), getActiveTemplate()]);
  if (!data) notFound();

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link href={backHref} className="text-sm text-ink-soft hover:text-sunset">
          &larr; Order
        </Link>
        <PrintButton />
      </div>
      <Invoice invoice={data as unknown as InvoiceData} template={template} />
    </>
  );
}
