import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Finish setup · Spectra Wholesale" };

// Landing page for invite links. Shows what was carried over from the access
// request so the new user can see there's nothing left to fill in.
export default async function SetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=link");

  const { data: profile } = await createServiceClient()
    .from("profiles")
    .select("first_name, full_name, phone, companies(name, type, license_number, address, city, zip)")
    .eq("id", user.id)
    .single();

  const company = Array.isArray(profile?.companies) ? profile.companies[0] : profile?.companies;
  const firstName = profile?.first_name ?? profile?.full_name?.split(" ")[0];
  const onFile = company
    ? [
        ["Business", company.name],
        ["Account", company.type === "seller" ? "Vendor" : "Buyer"],
        ["License #", company.license_number],
        ["Address", [company.address, [company.city, company.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")],
        ["Contact", `${profile?.full_name ?? ""}${profile?.phone ? ` · ${profile.phone}` : ""}`],
      ].filter(([, value]) => value)
    : [];

  return (
    <>
      <h1 className="font-display text-[2.1rem] leading-tight font-normal tracking-tight">
        {firstName ? `Welcome, ${firstName}.` : "Welcome."}
      </h1>
      <p className="mt-2 mb-6 text-[15px] text-ink-soft">
        Your account is ready. Choose a password and you&rsquo;re in.
      </p>

      {onFile.length > 0 && (
        <div className="mb-8 border-y border-line py-4">
          <p className="mb-3 font-mono text-[11px] tracking-[0.16em] text-ink-soft uppercase">Already on file</p>
          <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1.5 text-[14px]">
            {onFile.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-ink-soft">{label}</dt>
                <dd className={label === "License #" ? "font-mono" : undefined}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <SetPasswordForm />
    </>
  );
}
