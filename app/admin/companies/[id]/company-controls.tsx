"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { Field, Notice, SubmitButton, useLiveErrors } from "@/components/form";
import { setCompanyActive, updateCompanyIdentity, type AdminCompanyState } from "../actions";

export function IdentityForm({ id, name, license }: { id: string; name: string; license: string }) {
  const [state, formAction, pending] = useActionState<AdminCompanyState, FormData>(updateCompanyIdentity.bind(null, id), {});
  const { errors, markEdited } = useLiveErrors(state.fieldErrors);

  return (
    <form
      noValidate
      onChange={markEdited}
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="space-y-5"
    >
      {state.ok && <Notice tone="success">{state.ok}</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="Business name" name="name" defaultValue={name} error={errors.name} />
      <Field label="License number" name="license_number" defaultValue={license} error={errors.license_number} className="max-w-xs" />
      <div className="max-w-48">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Save
        </SubmitButton>
      </div>
    </form>
  );
}

export function PauseControl({ id, name, active, isVendor }: { id: string; name: string; active: boolean; isVendor: boolean }) {
  const [result, setResult] = useState<{ ok?: string; error?: string }>({});
  const [pending, startPending] = useTransition();

  const consequence = isVendor
    ? "Their users are locked out and their products disappear from Browse."
    : "Their users are locked out and can’t place orders.";

  return (
    <div className="space-y-3">
      <p className="text-[14px]">
        Status:{" "}
        {active ? <span className="text-success">Active</span> : <span className="text-danger">Paused</span>}
      </p>
      <p className="text-[13px] text-ink-soft">{active ? `Pausing: ${consequence}` : "Reactivating restores access right away."}</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (active && !confirm(`Pause ${name}? ${consequence}`)) return;
          startPending(async () => setResult(await setCompanyActive(id, !active)));
        }}
        className={`cursor-pointer rounded-[3px] border px-4 py-2.5 text-[14px] font-medium transition-colors disabled:cursor-wait disabled:opacity-60 ${
          active ? "border-line hover:border-danger hover:text-danger" : "border-success text-success hover:bg-success-tint"
        }`}
      >
        {pending ? "Saving…" : active ? "Pause account" : "Reactivate account"}
      </button>
      {result.error && <p className="text-[13px] text-danger">{result.error}</p>}
    </div>
  );
}
