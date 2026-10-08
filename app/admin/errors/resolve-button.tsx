"use client";

import { useTransition } from "react";
import { resolveError } from "./actions";

export function ResolveButton({ fingerprint }: { fingerprint: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => resolveError(fingerprint))}
      className="cursor-pointer rounded-[3px] border border-ink px-3 py-1.5 text-[13px] transition-colors hover:border-sunset hover:text-sunset disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Resolving…" : "Mark resolved"}
    </button>
  );
}
