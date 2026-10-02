"use client";

export function PrintButton({ label = "Print / save PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="cursor-pointer rounded-[3px] bg-sunset px-5 py-2.5 text-[14px] font-semibold text-on-sunset shadow-[3px_3px_0_0_var(--press)] transition-[background-color,transform,box-shadow] duration-100 hover:bg-sunset-hover active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
    >
      {label}
    </button>
  );
}
