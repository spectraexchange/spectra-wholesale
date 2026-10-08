import type { Metadata } from "next";
import { SupportList } from "@/components/support-pages";
import { requireSeller } from "@/lib/auth";

export const metadata: Metadata = { title: "Support · Spectra Wholesale" };

export default async function SellerSupportPage() {
  return <SupportList viewer={await requireSeller()} base="/seller" />;
}
