import type { Metadata } from "next";
import { AccountPage } from "@/components/account-page";
import { requireSeller } from "@/lib/auth";

export const metadata: Metadata = { title: "Account · Spectra Wholesale" };

export default async function SellerAccountPage() {
  return <AccountPage viewer={await requireSeller()} />;
}
