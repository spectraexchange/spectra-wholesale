import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer, homeFor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account paused · Spectra Wholesale" };

async function signOut() {
  "use server";
  await (await createClient()).auth.signOut();
  redirect("/login?message=signed-out");
}

export default async function PausedPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  // Only paused companies belong here
  if (viewer.role === "super_admin") redirect("/admin");
  const company = viewer.company;
  if (company?.is_active && company.is_approved) redirect(homeFor(viewer.role));
  const state = !company ? "none" : !company.is_approved ? "pending" : "paused";

  return (
    <>
      <h1 className="font-display text-[2.1rem] leading-tight font-normal tracking-tight">
        {state === "paused" ? "Account paused" : state === "pending" ? "Waiting for approval" : "No business on file"}
      </h1>
      <p className="mt-2 mb-8 text-[15px] text-ink-soft">
        {state === "paused"
          ? `${company?.name}\u2019s Spectra account is paused, so ordering and listings are on hold.`
          : state === "pending"
            ? `${company?.name} hasn\u2019t been approved for Spectra yet.`
            : "This login isn\u2019t connected to an approved business. Spectra accounts are created through a request for access."}
      </p>
      <div className="space-y-4 border-t border-line pt-6 text-[15px] text-ink-soft">
        <p>
          If you think this is a mistake, email{" "}
          <a href="mailto:info@spectrawholesale.com" className="font-medium text-ink underline decoration-sunset decoration-2 underline-offset-4 hover:text-sunset">
            info@spectrawholesale.com
          </a>{" "}
          and we&rsquo;ll sort it out.
        </p>
      </div>
      <form action={signOut} className="mt-8 border-t border-line pt-6">
        <button type="submit" className="cursor-pointer text-sm text-ink-soft underline decoration-line underline-offset-4 hover:text-sunset">
          Sign out
        </button>
      </form>
    </>
  );
}
