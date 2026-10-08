import type { Metadata } from "next";
import { SupportTicket } from "@/components/support-pages";
import { requireBuyer } from "@/lib/auth";

export const metadata: Metadata = { title: "Support request · Spectra Wholesale" };

export default async function BuyerSupportTicketPage({ params }: PageProps<"/buyer/support/[id]">) {
  const viewer = await requireBuyer();
  const { id } = await params;
  return <SupportTicket viewer={viewer} base="/buyer" id={id} />;
}
