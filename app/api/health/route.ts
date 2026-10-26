import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Status check, called daily by Vercel Cron (vercel.json). The tiny query is
// also real database activity, so Supabase never sees the project as idle.
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const { error } = await createServiceClient().from("companies").select("id", { count: "exact", head: true });
  const ms = Date.now() - started;

  // Reports only up/down and timing; no data leaves this endpoint.
  return NextResponse.json(
    { ok: !error, database: error ? "down" : "up", ms, at: new Date().toISOString() },
    { status: error ? 503 : 200, headers: { "cache-control": "no-store" } },
  );
}
