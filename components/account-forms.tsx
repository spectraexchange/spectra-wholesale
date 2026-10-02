"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { Field, Notice, SubmitButton, TextArea, useLiveErrors } from "@/components/form";
import { changePassword, updateCompany, updateProfile, type AccountFormState } from "@/lib/account-actions";

type Action = (prev: AccountFormState, formData: FormData) => Promise<AccountFormState>;

// Submits without React's automatic form reset, so a failed save keeps what was typed.
function useAccountForm(action: Action) {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(action, {});
  const { errors, markEdited } = useLiveErrors(state.fieldErrors);
  const formProps = {
    noValidate: true,
    onChange: markEdited,
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      startTransition(() => formAction(formData));
    },
  };
  return { state, errors, pending, formProps };
}

function Result({ state }: { state: AccountFormState }) {
  if (state.ok) return <Notice tone="success">{state.ok}</Notice>;
  if (state.error) return <Notice tone="error">{state.error}</Notice>;
  return null;
}

export function ProfileForm({ profile }: { profile: { first_name: string; last_name: string; phone: string; email: string } }) {
  const { state, errors, pending, formProps } = useAccountForm(updateProfile);

  return (
    <form {...formProps} className="space-y-5">
      <Result state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="first_name" autoComplete="given-name" defaultValue={profile.first_name} error={errors.first_name} />
        <Field label="Last name" name="last_name" autoComplete="family-name" defaultValue={profile.last_name} error={errors.last_name} />
      </div>
      <Field label="Phone" name="phone" type="tel" autoComplete="tel" defaultValue={profile.phone} error={errors.phone} />
      <Field
        label="Email"
        name="email_display"
        type="email"
        value={profile.email}
        readOnly
        disabled
        hint={<span className="text-xs text-ink-soft">Email us to change</span>}
      />
      <div className="max-w-56">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Save profile
        </SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const { state, errors, pending, formProps } = useAccountForm(changePassword);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields once the password has changed
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} {...formProps} className="space-y-5">
      <Result state={state} />
      <Field
        label="Current password"
        name="current_password"
        type="password"
        autoComplete="current-password"
        error={errors.current_password}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" name="new_password" type="password" autoComplete="new-password" error={errors.new_password} />
        <Field label="Confirm" name="confirm_password" type="password" autoComplete="new-password" error={errors.confirm_password} />
      </div>
      <div className="max-w-56">
        <SubmitButton pending={pending} pendingLabel="Changing…">
          Change password
        </SubmitButton>
      </div>
    </form>
  );
}

export type CompanyDetails = {
  phone: string;
  email: string;
  address: string;
  city: string;
  zip: string;
  receiving_hours: string;
  delivery_instructions: string;
};

export function CompanyForm({ company, isBuyer }: { company: CompanyDetails; isBuyer: boolean }) {
  const { state, errors, pending, formProps } = useAccountForm(updateCompany);

  return (
    <form {...formProps} className="space-y-5">
      <Result state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business phone" name="phone" type="tel" defaultValue={company.phone} error={errors.phone} />
        <Field
          label="Order email"
          name="email"
          type="email"
          defaultValue={company.email}
          error={errors.email}
          hint={<span className="text-xs text-ink-soft">Order emails go here</span>}
        />
      </div>
      <Field label="Street address" name="address" autoComplete="street-address" defaultValue={company.address} error={errors.address} />
      <div className="grid grid-cols-[1fr_7.5rem] gap-4">
        <Field label="City" name="city" autoComplete="address-level2" defaultValue={company.city} error={errors.city} />
        <Field label="ZIP" name="zip" inputMode="numeric" autoComplete="postal-code" defaultValue={company.zip} error={errors.zip} />
      </div>
      {isBuyer && (
        <>
          <Field
            label="Receiving hours"
            name="receiving_hours"
            defaultValue={company.receiving_hours}
            placeholder="Mon–Fri, 10am–4pm"
            error={errors.receiving_hours}
          />
          <TextArea
            label="Delivery instructions"
            name="delivery_instructions"
            rows={2}
            defaultValue={company.delivery_instructions}
            placeholder="Back entrance, ask for the inventory manager"
            error={errors.delivery_instructions}
          />
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
