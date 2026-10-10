"use client";

import { useEffect } from "react";
import { sendBrowserError } from "@/components/error-reporter";

// Last resort when the root layout itself fails. It replaces the whole document,
// so global styles don't load; colors are inline (paper/ink from the palette).
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => sendBrowserError(error, "App crashed"), [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", background: "#faf8f4", color: "#1b1813", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <title>Something went wrong · Spectra Wholesale</title>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "96px 24px" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 36, margin: 0 }}>Spectra didn&rsquo;t load.</h1>
          <p style={{ color: "#5a5246", fontSize: 15, lineHeight: 1.55 }}>
            We&rsquo;ve logged the problem. Try again, or email{" "}
            <a href="mailto:info@spectrawholesale.com" style={{ color: "#c4461a" }}>
              info@spectrawholesale.com
            </a>{" "}
            if it keeps happening.
          </p>
          {error.digest && <p style={{ fontFamily: "Menlo, monospace", fontSize: 12, color: "#5a5246" }}>Error ID {error.digest}</p>}
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: 16, cursor: "pointer", border: 0, borderRadius: 3, background: "#c4461a", color: "#faf8f4", padding: "12px 20px", fontSize: 15, fontWeight: 600, boxShadow: "3px 3px 0 0 #1b1813" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
