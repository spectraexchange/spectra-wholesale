import type { Metadata } from "next";
import { AccountPage } from "@/components/account-page";
import { requireBuyer } from "@/lib/auth";

export const metadata: Metadata = { title: "Account · Spectra Wholesale" };

export default async function BuyerAccountPage() {
  return <AccountPage viewer={await requireBuyer()} />;
}
