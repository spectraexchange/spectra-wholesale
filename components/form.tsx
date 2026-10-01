"use client";

import { useFormStatus } from "react-dom";

const inputClass =
  "block w-full rounded-[3px] border border-line bg-white/70 px-3.5 py-3 text-[15px] text-ink transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-ink-soft/50 hover:border-ink-soft/50 focus:border-sunset focus:bg-white focus:shadow-[0_0_0_3px_rgba(196,70,26,0.18)] focus:outline-none aria-invalid:border-danger";

export function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="font-mono text-[11px] tracking-[0.16em] text-ink-soft uppercase">
      {children}
    </label>
  );
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="mt-1.5 text-[13px] text-danger">
      {error}
    </p>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  hint?: React.ReactNode;
  error?: string;
};

export function Field({ label, name, hint, error, className = "", ...input }: FieldProps) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <Label htmlFor={name}>{label}</Label>
        {hint}
      </div>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={inputClass}
        {...input}
      />
      <FieldError id={`${name}-error`} error={error} />
    </div>
  );
}

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  name: string;
  hint?: React.ReactNode;
  error?: string;
};

export function TextArea({ label, name, hint, error, className = "", ...input }: TextAreaProps) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <Label htmlFor={name}>{label}</Label>
        {hint}
      </div>
      <textarea
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        className={`${inputClass} resize-y`}
        {...input}
      />
      <FieldError id={`${name}-error`} error={error} />
    </div>
  );
}

// Retro offset shadow (echoes the logo's teal drop shadow) that presses flat on click.
// Reads pending from the parent <form action>, or from `pending` when the form submits manually.
export function SubmitButton({
  children,
  pendingLabel,
  pending: pendingProp,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;

  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative flex w-full cursor-pointer items-center justify-center gap-2 rounded-[3px] bg-sunset px-5 py-3.5 text-[15px] font-semibold text-paper shadow-[3px_3px_0_0_var(--ink)] transition-[background-color,transform,box-shadow] duration-100 hover:bg-sunset-hover active:translate-x-[3px] active:translate-y-[3px] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sunset disabled:cursor-wait disabled:opacity-80"
    >
      {pending ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-paper/40 border-t-paper" />
          {pendingLabel}
        </>
      ) : (
        <>
          {children}
          <span aria-hidden className="transition-transform duration-150 group-hover:translate-x-1">
            &rarr;
          </span>
        </>
      )}
    </button>
  );
}

export function Notice({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const styles =
    tone === "error"
      ? "border-danger bg-danger-tint text-danger"
      : "border-success bg-success-tint text-success";

  return (
    <div role={tone === "error" ? "alert" : "status"} className={`border-l-[3px] px-3.5 py-2.5 text-sm ${styles}`}>
      {children}
    </div>
  );
}
