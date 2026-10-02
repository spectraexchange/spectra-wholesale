import type { Metadata } from "next";
import { InvoicePage } from "@/components/invoice-page";
import { requireSeller } from "@/lib/auth";

export const metadata: Metadata = { title: "Invoice · Spectra Wholesale" };

export default async function SellerInvoicePage({ params }: PageProps<"/seller/orders/[id]/invoice">) {
  const { company } = await requireSeller();
  const { id } = await params;
  return <InvoicePage orderId={id} scope={{ column: "seller_company_id", companyId: company.id }} backHref={`/seller/orders/${id}`} />;
}
