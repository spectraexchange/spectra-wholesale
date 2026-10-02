import { redirect } from "next/navigation";

// Company details moved into Account
export default function SellerCompanyPage() {
  redirect("/seller/account");
}
