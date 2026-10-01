"use client";

import { useState, useTransition } from "react";
import { approveRequest, rejectRequest, resendInvite, type ActionResult } from "./actions";

export function RequestActions({ id, status, company }: { id: string; status: string; company: string }) {
  const [result, setResult] = useState<ActionResult>({});
  const [pending, startTransition] = useTransition();

  const run = (action: (id: string) => Promise<ActionResult>) =>
    startTransition(async () => setResult(await action(id)));

  return (
    <div className="flex flex-col items-start gap-3 sm:items-end">
      <div className="flex gap-2">
        {status === "pending" && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (confirm(`Reject ${company}? They won't be notified.`)) run(rejectRequest);
              }}
              className="cursor-pointer rounded-[3px] border border-line px-4 py-2 text-sm font-medium transition-colors hover:border-danger hover:text-danger disabled:cursor-wait disabled:opacity-60"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(approveRequest)}
              className="cursor-pointer rounded-[3px] bg-sunset px-4 py-2 text-sm font-semibold text-paper shadow-[2px_2px_0_0_var(--ink)] transition-[background-color,transform,box-shadow] duration-100 hover:bg-sunset-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? "Working…" : "Approve & invite"}
            </button>
          </>
        )}
        {status === "approved" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(resendInvite)}
            className="cursor-pointer rounded-[3px] border border-line px-4 py-2 text-sm font-medium transition-colors hover:border-sunset hover:text-sunset disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Sending…" : "Resend invite"}
          </button>
        )}
      </div>
      {result.ok && <p className="text-sm text-success">{result.ok}</p>}
      {result.error && <p className="max-w-xs text-sm text-danger sm:text-right">{result.error}</p>}
    </div>
  );
}
