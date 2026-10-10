import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Notice } from "@/components/form";
import { RETURNING_COOKIE } from "@/lib/returning";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · Spectra Wholesale" };

const NOTICES: Record<string, { tone: "error" | "success"; text: string }> = {
  link: { tone: "error", text: "That link has expired or was already used. Use \u201cForgot password?\u201d below to get a fresh one." },
  "password-updated": { tone: "success", text: "Password updated. Sign in with your new password." },
  "signed-out": { tone: "success", text: "You’ve been signed out." },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, message } = await searchParams;
  const key = typeof error === "string" ? error : typeof message === "string" ? message : undefined;
  const notice = key ? NOTICES[key] : undefined;
  const returning = (await cookies()).has(RETURNING_COOKIE);

  return (
    <>
      <h1 className={`font-display text-[2.1rem] leading-tight font-normal tracking-tight ${returning ? "" : "mb-8"}`}>Sign in</h1>
      {returning && <p className="mt-2 mb-8 text-[15px] text-ink-soft">Welcome back.</p>}

      <LoginForm notice={notice && <Notice tone={notice.tone}>{notice.text}</Notice>} />

      <div className="mt-8 border-t border-line pt-6 text-sm text-ink-soft">
        <p className="font-mono text-[11px] tracking-[0.16em] uppercase">New to Spectra?</p>
        <p className="mt-2 font-display text-xl leading-snug text-ink">Send us your menu. We&rsquo;ll build your store.</p>
        <Link
          href="/request-access"
          className="mt-2 inline-block font-medium text-ink underline decoration-sunset decoration-2 underline-offset-4 transition-colors hover:text-sunset"
        >
          Request access &rarr;
        </Link>
        <p className="mt-5">
          Trouble signing in?{" "}
          <Link href="/support" className="underline decoration-line underline-offset-4 transition-colors hover:text-sunset hover:decoration-sunset">
            Contact support
          </Link>
        </p>
      </div>
    </>
  );
}
