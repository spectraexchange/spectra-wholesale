// Writes to `site_errors` (admin → Errors). Plain fetch to the REST API so it runs
// anywhere, including instrumentation and the proxy. Never throws: logging an
// error must not cause another one.

export type ErrorSource = "server" | "browser" | "email";

export type ErrorEntry = {
  source: ErrorSource;
  message: string;
  detail?: string | null;
  route?: string | null;
  path?: string | null;
  digest?: string | null;
  userId?: string | null;
  userAgent?: string | null;
};

const clip = (value: string | null | undefined, max: number) => (value ? value.slice(0, max) : null);

// Repeats of one error share a fingerprint: ids, numbers and quoted values are
// stripped so "Order 1043 not found" and "Order 1050 not found" group together.
export function fingerprint(entry: Pick<ErrorEntry, "source" | "message" | "route">) {
  const message = entry.message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>")
    .replace(/(["'“‘]).*?(["'”’])/g, "<value>")
    .replace(/\d+/g, "<n>")
    .slice(0, 300);
  const key = `${entry.source}|${entry.route ?? ""}|${message}`;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) hash = ((hash << 5) + hash + key.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

export async function logError(entry: ErrorEntry) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/site_errors`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({
        source: entry.source,
        message: clip(entry.message, 1000) || "Unknown error",
        detail: clip(entry.detail, 8000),
        route: clip(entry.route, 300),
        path: clip(entry.path, 500),
        digest: clip(entry.digest, 100),
        user_id: entry.userId ?? null,
        user_agent: clip(entry.userAgent, 400),
        fingerprint: fingerprint(entry),
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Nowhere left to report it
  }
}

/** ISO timestamp `days` ago, for "last N days" queries. */
export const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
