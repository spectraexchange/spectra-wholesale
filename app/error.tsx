"use client";

import Link from "next/link";
import { useEffect } from "react";
import { sendBrowserError } from "@/components/error-reporter";

// Shown when a page crashes. Server errors are already logged by instrumentation.ts;
// browser-only ones are reported from here.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => sendBrowserError(error, "Page crashed"), [error]);

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-24">
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">Something went wrong</p>
      <h1 className="mt-2 font-display text-4xl font-light tracking-tight">This page didn&rsquo;t load.</h1>
      <p className="mt-4 text-[15px] text-ink-soft">
        We&rsquo;ve logged the problem. Try again, and if it keeps happening, let us know and we&rsquo;ll sort it out.
      </p>
      {error.digest && <p className="mt-3 font-mono text-[12px] text-ink-soft">Error ID {error.digest}</p>}
      <div className="mt-8 flex flex-wrap items-center gap-6">
        <button
          type="button"
          onClick={() => retry()}
          className="cursor-pointer rounded-[3px] bg-sunset px-5 py-3 text-[15px] font-semibold text-on-sunset shadow-[3px_3px_0_0_var(--press)] transition-[background-color,transform,box-shadow] duration-100 hover:bg-sunset-hover active:translate-x-[3px] active:translate-y-[3px] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sunset"
        >
          Try again
        </button>
        <Link href="/support" className="text-[15px] text-ink underline decoration-sunset decoration-2 underline-offset-4 hover:text-sunset">
          Contact support
        </Link>
      </div>
    </main>
  );
}
