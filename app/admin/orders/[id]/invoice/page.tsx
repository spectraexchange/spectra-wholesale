import type { Metadata } from "next";
import { InvoicePage } from "@/components/invoice-page";
import { requireSuperAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Invoice · Spectra Admin" };

export default async function AdminInvoicePage({ params }: PageProps<"/admin/orders/[id]/invoice">) {
  await requireSuperAdmin();
  const { id } = await params;
  return <InvoicePage orderId={id} scope={null} backHref={`/admin/orders/${id}`} />;
}
