import type { Metadata } from "next";
import { SupportTicket } from "@/components/support-pages";
import { requireSeller } from "@/lib/auth";

export const metadata: Metadata = { title: "Support request · Spectra Wholesale" };

export default async function SellerSupportTicketPage({ params }: PageProps<"/seller/support/[id]">) {
  const viewer = await requireSeller();
  const { id } = await params;
  return <SupportTicket viewer={viewer} base="/seller" id={id} />;
}
