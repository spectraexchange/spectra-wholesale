"use server";

import { headers } from "next/headers";
import { getViewer } from "@/lib/auth";
import { fingerprint, logError } from "@/lib/error-log";
import { createServiceClient } from "@/lib/supabase/server";

// Browser crashes reported by the error boundaries and the global listener.
// Anyone can call this (errors happen before sign-in too), so inputs are clipped
// and a repeat of the same error from anywhere within a minute is dropped.
export async function reportBrowserError(report: { message: string; stack?: string; path?: string; kind?: string }) {
  const message = String(report.message ?? "").slice(0, 1000);
  if (!message) return;
  const path = String(report.path ?? "").slice(0, 500) || null;
  const route = path ? path.split("?")[0] : null;

  const print = fingerprint({ source: "browser", message, route });
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await createServiceClient()
    .from("site_errors")
    .select("id", { count: "exact", head: true })
    .eq("fingerprint", print)
    .gte("created_at", since);
  if (count) return;

  const viewer = await getViewer().catch(() => null);
  await logError({
    source: "browser",
    message,
    detail: [report.kind, String(report.stack ?? "").slice(0, 8000)].filter(Boolean).join("\n\n"),
    route,
    path,
    userId: viewer?.id,
    userAgent: (await headers()).get("user-agent"),
  });
}
