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
  if (!viewer.company || viewer.company.is_active) redirect(homeFor(viewer.role));

  return (
    <>
      <h1 className="font-display text-[2.1rem] leading-tight font-normal tracking-tight">Account paused</h1>
      <p className="mt-2 mb-8 text-[15px] text-ink-soft">
        {viewer.company.name}&rsquo;s Spectra account is paused, so ordering and listings are on hold.
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
