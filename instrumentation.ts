import type { Instrumentation } from "next";
import { logError } from "@/lib/error-log";

// Every server error (pages, route handlers, server actions, proxy) lands in
// admin → Errors. redirect() and notFound() also arrive here as thrown values;
// they're normal control flow, not failures.
const CONTROL_FLOW = /^(NEXT_REDIRECT|NEXT_HTTP_ERROR_FALLBACK|NEXT_NOT_FOUND|DYNAMIC_SERVER_USAGE|BAILOUT_TO_CLIENT_SIDE_RENDERING)/;

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;
  if (digest && CONTROL_FLOW.test(digest)) return;

  const message = err instanceof Error ? err.message : String(err);
  const userAgent = request.headers["user-agent"];
  await logError({
    source: "server",
    message,
    detail: [`${request.method} ${request.path} · ${context.routeType}`, err instanceof Error ? err.stack : null].filter(Boolean).join("\n\n"),
    route: context.routePath,
    path: request.path,
    digest,
    userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
  });
};
