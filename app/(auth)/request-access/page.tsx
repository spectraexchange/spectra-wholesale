import type { Metadata } from "next";
import Link from "next/link";
import { RequestForm } from "./request-form";

export const metadata: Metadata = { title: "Request access · Spectra Wholesale" };

export default function RequestAccessPage() {
  return (
    <>
      <h1 className="font-display text-[2.1rem] leading-tight font-normal tracking-tight">Request access</h1>
      <p className="mt-2 mb-8 text-[15px] text-ink-soft">
        Spectra is open to licensed Alaska cannabis businesses. Fill this out once and it becomes your account.
      </p>

      <RequestForm />

      <div className="mt-8 border-t border-line pt-6 text-sm text-ink-soft">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-ink underline decoration-sunset decoration-2 underline-offset-4 transition-colors hover:text-sunset"
        >
          Sign in
        </Link>
      </div>
    </>
  );
}
