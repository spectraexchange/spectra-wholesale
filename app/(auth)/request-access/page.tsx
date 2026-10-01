import type { Metadata } from "next";
import { RequestForm } from "./request-form";

export const metadata: Metadata = { title: "Request access · Spectra Wholesale" };

// Heading and footer live in RequestForm so the thank-you state can replace them.
export default function RequestAccessPage() {
  return <RequestForm />;
}
