import type { Metadata } from "next";
import { Notice } from "@/components/form";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · Spectra Wholesale" };

const NOTICES: Record<string, { tone: "error" | "success"; text: string }> = {
  link: { tone: "error", text: "That link has expired or was already used. Request a new one below." },
  "password-updated": { tone: "success", text: "Password updated. Sign in with your new password." },
  "signed-out": { tone: "success", text: "You’ve been signed out." },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, message } = await searchParams;
  const key = typeof error === "string" ? error : typeof message === "string" ? message : undefined;
  const notice = key ? NOTICES[key] : undefined;

  return (
    <>
      <h1 className="font-display text-[2.1rem] leading-tight font-normal tracking-tight">Sign in</h1>
      <p className="mt-2 mb-8 text-[15px] text-ink-soft">Welcome back. Your catalog and orders are waiting.</p>

      <LoginForm notice={notice && <Notice tone={notice.tone}>{notice.text}</Notice>} />

      <div className="mt-8 border-t border-line pt-6 text-sm text-ink-soft">
        New to Spectra?{" "}
        <a
          href="mailto:info@spectrawholesale.com?subject=Spectra%20Wholesale%20access%20request"
          className="font-medium text-ink underline decoration-sunset decoration-2 underline-offset-4 transition-colors hover:text-sunset"
        >
          Request access
        </a>
      </div>
    </>
  );
}
