"use client";

import Link from "next/link";
import { useTransition } from "react";
import { updateProductStatus } from "./actions";

const linkClass =
  "cursor-pointer text-[13px] text-ink-soft underline decoration-line underline-offset-4 transition-colors hover:text-sunset hover:decoration-sunset disabled:cursor-wait disabled:opacity-50";

export function ProductRowActions({ id, name, view }: { id: string; name: string; view: "active" | "hidden" | "archived" }) {
  const [pending, startTransition] = useTransition();
  const run = (change: Parameters<typeof updateProductStatus>[1]) =>
    startTransition(async () => {
      const result = await updateProductStatus(id, change);
      if (result.error) alert(result.error);
    });

  return (
    <div className="col-span-3 flex justify-end gap-4 sm:col-span-1">
      {view !== "archived" && (
        <Link href={`/seller/products/${id}`} className={linkClass}>
          Edit
        </Link>
      )}
      {view === "active" && (
        <button type="button" disabled={pending} onClick={() => run({ is_active: false })} className={linkClass}>
          Hide
        </button>
      )}
      {view === "hidden" && (
        <button type="button" disabled={pending} onClick={() => run({ is_active: true })} className={linkClass}>
          Show
        </button>
      )}
      {view !== "archived" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`Archive "${name}"? You can restore it from the Archived tab.`)) run({ is_archived: true });
          }}
          className={linkClass}
        >
          Archive
        </button>
      ) : (
        <button type="button" disabled={pending} onClick={() => run({ is_archived: false })} className={linkClass}>
          Restore
        </button>
      )}
    </div>
  );
}
