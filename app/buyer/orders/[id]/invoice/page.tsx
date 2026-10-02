import type { Metadata } from "next";
import { InvoicePage } from "@/components/invoice-page";
import { requireBuyer } from "@/lib/auth";

export const metadata: Metadata = { title: "Invoice · Spectra Wholesale" };

export default async function BuyerInvoicePage({ params }: PageProps<"/buyer/orders/[id]/invoice">) {
  const { company } = await requireBuyer();
  const { id } = await params;
  return <InvoicePage orderId={id} scope={{ column: "buyer_company_id", companyId: company.id }} backHref={`/buyer/orders/${id}`} />;
}
