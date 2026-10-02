"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Field, Notice, Select, SubmitButton, TextArea, useLiveErrors } from "@/components/form";
import { PAYMENT_METHODS, SUBSCRIPTION_STATUSES } from "@/lib/billing";
import {
  deletePayment,
  recordPayment,
  sendPasswordReset,
  startViewAs,
  updateCompanyDetails,
  updateSubscription,
  updateUser,
  type AdminFormState,
} from "../actions";

type Action = (prev: AdminFormState, fd: FormData) => Promise<AdminFormState>;

// Manual submit (no automatic reset) + errors that clear as fields are edited.
function useAdminForm(action: Action) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(action, {});
  const { errors, markEdited } = useLiveErrors(state.fieldErrors);
  const formProps = {
    noValidate: true,
    onChange: markEdited,
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      startTransition(() => formAction(fd));
    },
  };
  return { state, errors, pending, formProps };
}

function Result({ state }: { state: AdminFormState }) {
  if (state.ok) return <Notice tone="success">{state.ok}</Notice>;
  if (state.error) return <Notice tone="error">{state.error}</Notice>;
  return null;
}

const SMALL_BUTTON =
  "cursor-pointer rounded-[3px] border border-line px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-ink disabled:cursor-wait disabled:opacity-60";

// ── Company ────────────────────────────────────────────────────────────────

export type CompanyFields = {
  name: string;
  license_number: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zip: string;
  receiving_hours: string;
  delivery_instructions: string;
};

export function CompanyDetailsForm({ id, company, isBuyer }: { id: string; company: CompanyFields; isBuyer: boolean }) {
  const { state, errors, pending, formProps } = useAdminForm(updateCompanyDetails.bind(null, id));

  return (
    <form {...formProps} className="space-y-5">
      <Result state={state} />
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Field label="Business name" name="name" defaultValue={company.name} error={errors.name} />
        <Field label="License #" name="license_number" defaultValue={company.license_number} error={errors.license_number} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" name="phone" type="tel" defaultValue={company.phone} error={errors.phone} />
        <Field label="Order email" name="email" type="email" defaultValue={company.email} error={errors.email} />
      </div>
      <Field label="Street address" name="address" defaultValue={company.address} error={errors.address} />
      <div className="grid grid-cols-[1fr_7.5rem] gap-4">
        <Field label="City" name="city" defaultValue={company.city} error={errors.city} />
        <Field label="ZIP" name="zip" inputMode="numeric" defaultValue={company.zip} error={errors.zip} />
      </div>
      {isBuyer && (
        <>
          <Field label="Receiving hours" name="receiving_hours" defaultValue={company.receiving_hours} />
          <TextArea label="Delivery instructions" name="delivery_instructions" rows={2} defaultValue={company.delivery_instructions} />
        </>
      )}
      <div className="max-w-56">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Save company
        </SubmitButton>
      </div>
    </form>
  );
}

// ── Users ──────────────────────────────────────────────────────────────────

export type UserFields = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  isAdmin: boolean;
};

export function UserRow({ user, lastSeen }: { user: UserFields; lastSeen: string }) {
  const [editing, setEditing] = useState(false);
  const [result, setResult] = useState<AdminFormState>({});
  const [pending, startPending] = useTransition();
  const { state, errors, pending: saving, formProps } = useAdminForm(updateUser.bind(null, user.id));

  // Close the editor when a save succeeds (adjusting state during render, not in an effect)
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.ok) setEditing(false);
  }

  const name = `${user.first_name} ${user.last_name}`.trim() || user.email;

  return (
    <li className="py-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="truncate">
            {name}
            <span className="ml-2 font-mono text-[10px] tracking-[0.14em] text-ink-soft uppercase">{user.isAdmin ? "Admin" : "Member"}</span>
          </p>
          <p className="truncate text-[13px] text-ink-soft">
            {user.email}
            {user.phone && ` · ${user.phone}`} &middot; {lastSeen}
          </p>
        </div>
        <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1 sm:justify-end">
          <button type="button" onClick={() => setEditing((v) => !v)} className={SMALL_BUTTON}>
            {editing ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm(`Email ${user.email} a link to choose a new password?`)) startPending(async () => setResult(await sendPasswordReset(user.id)));
            }}
            className={SMALL_BUTTON}
          >
            Send reset
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm(`View the app as ${name}? You'll be signed in as them until you click Exit.`))
                startPending(async () => setResult(await startViewAs(user.id)));
            }}
            className={`${SMALL_BUTTON} border-amber hover:bg-amber/15`}
          >
            View as
          </button>
        </div>
      </div>

      {(result.ok || result.error) && (
        <p className={`mt-2 text-[13px] ${result.error ? "text-danger" : "text-success"}`}>{result.error ?? result.ok}</p>
      )}
      {state.ok && !editing && <p className="mt-2 text-[13px] text-success">{state.ok}</p>}

      {editing && (
        <form {...formProps} className="mt-4 space-y-4 border-l-[3px] border-line pl-4">
          {state.error && <Notice tone="error">{state.error}</Notice>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" name="first_name" defaultValue={user.first_name} error={errors.first_name} />
            <Field label="Last name" name="last_name" defaultValue={user.last_name} error={errors.last_name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Login email"
              name="email"
              type="email"
              defaultValue={user.email}
              error={errors.email}
              hint={<span className="text-xs text-ink-soft">Changes how they sign in</span>}
            />
            <Field label="Phone" name="phone" type="tel" defaultValue={user.phone} error={errors.phone} />
          </div>
          <Select
            label="Access"
            name="access"
            options={[
              { value: "admin", label: "Admin: can edit company details" },
              { value: "member", label: "Member" },
            ]}
            defaultValue={user.isAdmin ? "admin" : "member"}
            className="max-w-xs"
          />
          <div className="max-w-48">
            <SubmitButton pending={saving} pendingLabel="Saving…">
              Save user
            </SubmitButton>
          </div>
        </form>
      )}
    </li>
  );
}

// ── Subscription & payments ────────────────────────────────────────────────

export type SubscriptionFields = {
  status: string;
  monthly_price: string;
  trial_ends_on: string;
  next_due_date: string;
  notes: string;
};

export function SubscriptionForm({ companyId, sub }: { companyId: string; sub: SubscriptionFields }) {
  const { state, errors, pending, formProps } = useAdminForm(updateSubscription.bind(null, companyId));
  const [status, setStatus] = useState(sub.status);

  return (
    <form {...formProps} className="space-y-5">
      <Result state={state} />
      <Select
        label="Status"
        name="status"
        options={Object.entries(SUBSCRIPTION_STATUSES).map(([value, s]) => ({ value, label: s.label }))}
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        error={errors.status}
      />
      {status === "deactivated" && sub.status !== "deactivated" && (
        <p className="text-[13px] text-danger">Saving as Deactivated locks this company&rsquo;s users out.</p>
      )}
      <Field label="Monthly price ($)" name="monthly_price" type="number" inputMode="decimal" step="0.01" min="0" defaultValue={sub.monthly_price} placeholder="0.00" error={errors.monthly_price} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Trial ends" name="trial_ends_on" type="date" defaultValue={sub.trial_ends_on} error={errors.trial_ends_on} />
        <Field label="Next due" name="next_due_date" type="date" defaultValue={sub.next_due_date} error={errors.next_due_date} />
      </div>
      <TextArea label="Notes" name="notes" rows={2} defaultValue={sub.notes} placeholder="Founding-member rate, billing contact, etc." />
      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save subscription
      </SubmitButton>
    </form>
  );
}

export function PaymentForm({ companyId, today, suggested }: { companyId: string; today: string; suggested: string }) {
  const { state, errors, pending, formProps } = useAdminForm(recordPayment.bind(null, companyId));
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} {...formProps} className="space-y-4">
      <Result state={state} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Amount ($)" name="amount" type="number" inputMode="decimal" step="0.01" min="0" defaultValue={suggested} error={errors.amount} />
        <Field label="Received" name="date" type="date" defaultValue={today} error={errors.date} />
      </div>
      <Select label="Method" name="method" options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} placeholder="—" error={errors.method} />
      <Field label="Note" name="note" placeholder="Check #, invoice, period covered" />
      <label className="flex cursor-pointer items-center gap-2 text-[14px]">
        <input type="checkbox" name="advance_due" defaultChecked className="size-4 accent-sunset" />
        Move next due date forward a month
      </label>
      <SubmitButton pending={pending} pendingLabel="Recording…">
        Record payment
      </SubmitButton>
    </form>
  );
}

export function DeletePaymentButton({ id, label }: { id: string; label: string }) {
  const [pending, startPending] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete the ${label} payment? Use this only to fix a mistake.`)) startPending(async () => void (await deletePayment(id)));
      }}
      className="cursor-pointer text-[12px] text-ink-soft underline decoration-line underline-offset-4 hover:text-danger disabled:opacity-50"
    >
      Delete
    </button>
  );
}
