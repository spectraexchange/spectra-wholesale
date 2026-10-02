"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { InvoiceTemplate } from "@/lib/invoice-templates";
import { setInvoiceTemplate } from "./actions";

export function TemplatePicker({ templates, active }: { templates: InvoiceTemplate[]; active: string }) {
  const [current, setCurrent] = useState(active);
  const [result, setResult] = useState<{ ok?: string; error?: string }>({});
  const [pending, startTransition] = useTransition();
  const [switching, setSwitching] = useState<string | null>(null);

  const choose = (key: string) => {
    setSwitching(key);
    startTransition(async () => {
      const r = await setInvoiceTemplate(key);
      setResult(r);
      if (r.ok) setCurrent(key);
      setSwitching(null);
    });
  };

  return (
    <div>
      {result.ok && <p role="status" className="mb-4 border-l-[3px] border-success bg-success-tint px-3.5 py-2.5 text-sm text-success">{result.ok}</p>}
      {result.error && <p role="alert" className="mb-4 border-l-[3px] border-danger bg-danger-tint px-3.5 py-2.5 text-sm text-danger">{result.error}</p>}

      <ul className="divide-y divide-line border-y border-line">
        {templates.map((t) => {
          const live = t.key === current;
          return (
            <li key={t.key} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-6 gap-y-3 py-5 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto]">
              <Swatch template={t} />
              <div className="min-w-0">
                <p className="font-display text-xl">
                  {t.name}
                  {live && <span className="ml-3 font-mono text-[11px] tracking-[0.16em] text-success uppercase">Live</span>}
                </p>
                <p className="text-[13px] text-ink-soft">{t.occasion}</p>
              </div>
              <div className="col-span-2 flex items-center gap-5 sm:col-span-1">
                <Link
                  href={`/admin/tools/preview/${t.key}`}
                  className="text-[14px] underline decoration-sunset underline-offset-4 hover:text-sunset"
                >
                  Preview
                </Link>
                <button
                  type="button"
                  disabled={live || pending}
                  onClick={() => choose(t.key)}
                  className="min-w-36 cursor-pointer rounded-[3px] bg-sunset px-4 py-2.5 text-[14px] font-semibold text-on-sunset shadow-[3px_3px_0_0_var(--press)] transition-[background-color,transform,box-shadow] duration-100 hover:bg-sunset-hover active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:cursor-default disabled:bg-transparent disabled:text-ink-soft disabled:shadow-none disabled:ring-1 disabled:ring-line"
                >
                  {live ? "In use" : switching === t.key ? "Switching…" : "Use this design"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// A tiny sketch of the sheet: header treatment, accent rules and the offset edge.
function Swatch({ template: t }: { template: InvoiceTemplate }) {
  return (
    <div aria-hidden className="relative h-[4.5rem] w-full">
      <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-[3px]" style={{ background: t.edge }} />
      <div className="absolute inset-0 overflow-hidden rounded-[3px] border border-[#d9cba8] bg-[#f7efdc]">
        {t.header === "band" ? (
          <div className="h-5" style={{ background: t.band }} />
        ) : (
          <div className="h-4 border-b-[3px]" style={{ borderColor: t.accent }} />
        )}
        <div className="space-y-1 px-1.5 pt-1.5">
          <div className="h-0.5 w-full" style={{ background: t.accent }} />
          <div className="h-px w-full bg-[#d9cba8]" />
          <div className="h-px w-full bg-[#d9cba8]" />
          <div className="ml-auto h-2 w-6 rounded-[1px]" style={{ background: t.tint }} />
        </div>
      </div>
    </div>
  );
}
