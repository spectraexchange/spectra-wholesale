import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NewTicketForm } from "@/components/support-forms";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Contact support · Spectra Wholesale" };

// Public: for anyone who can't sign in. Signed-in users get the in-app version.
export default async function PublicSupportPage() {
  const viewer = await getViewer();
  if (viewer?.role === "super_admin") redirect("/admin/support");
  if (viewer?.company) redirect(viewer.company.type === "seller" ? "/seller/support" : "/buyer/support");

  return (
    <>
      <h1 className="font-display text-[2.1rem] leading-tight font-normal tracking-tight">Contact support</h1>
      <p className="mt-2 mb-8 text-[15px] text-ink-soft">Trouble signing in, or a question before you join? We&rsquo;ll reply by email.</p>

      <NewTicketForm publicForm page="/support" />

      <div className="mt-8 border-t border-line pt-6 text-sm">
        <Link
          href="/login"
          className="text-ink-soft underline decoration-line underline-offset-4 transition-colors hover:text-sunset hover:decoration-sunset"
        >
          &larr; Back to sign in
        </Link>
      </div>
    </>
  );
}
