import type { Metadata } from "next";
import { SupportList } from "@/components/support-pages";
import { requireBuyer } from "@/lib/auth";

export const metadata: Metadata = { title: "Support · Spectra Wholesale" };

export default async function BuyerSupportPage() {
  return <SupportList viewer={await requireBuyer()} base="/buyer" />;
}
