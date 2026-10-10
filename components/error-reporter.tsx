"use client";

import { useEffect } from "react";
import { reportBrowserError } from "@/lib/error-actions";

const MAX_PER_PAGE = 5;
let sent = 0;

// Noise from browser extensions and harmless browser quirks
const IGNORE = [/ResizeObserver loop/, /^Script error\.?$/, /extension:\/\//, /Failed to fetch dynamically imported module/];

// A page left open across a deploy asks the new server for files or actions that
// only the old version had. A reload fixes it, so do that once instead of reporting.
const DEPLOY_SKEW = /unexpected response was received from the server|Failed to find Server Action|ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module/i;
const RELOADED_AT = "spectra_skew_reload";

/** Returns true if it started a reload. */
function reloadIfStale(err: Error) {
  if (!DEPLOY_SKEW.test(`${err.name} ${err.message}`)) return false;
  try {
    // Only once per 30 seconds, so a real problem can't cause a reload loop
    if (Date.now() - Number(sessionStorage.getItem(RELOADED_AT) ?? 0) < 30_000) return false;
    sessionStorage.setItem(RELOADED_AT, String(Date.now()));
  } catch {
    return false;
  }
  location.reload();
  return true;
}

export function sendBrowserError(error: unknown, kind: string) {
  const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : JSON.stringify(error));
  if (reloadIfStale(err)) return;
  // Errors forwarded from the server carry a digest and are already logged there
  if ("digest" in err && (err as { digest?: string }).digest) return;
  if (IGNORE.some((re) => re.test(err.message) || re.test(err.stack ?? ""))) return;
  if (sent >= MAX_PER_PAGE) return;
  sent++;
  reportBrowserError({ message: err.message, stack: err.stack, path: location.pathname + location.search, kind }).catch(() => undefined);
}

// Catches errors outside React's error boundaries (event handlers, async code).
export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => sendBrowserError(e.error ?? e.message, "Uncaught error");
    const onRejection = (e: PromiseRejectionEvent) => sendBrowserError(e.reason, "Unhandled promise rejection");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
