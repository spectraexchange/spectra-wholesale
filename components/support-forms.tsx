"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { Field, Notice, Select, SubmitButton, TextArea, useLiveErrors } from "@/components/form";
import { createTicket, replyToTicket, staffReply, type SupportFormState } from "@/lib/support-actions";
import { MAX_MESSAGE, TICKET_CATEGORIES, TICKET_STATUSES, type TicketStatus } from "@/lib/support";

/** `publicForm` adds name/email/company for people who can't sign in. */
export function NewTicketForm({ publicForm = false, page }: { publicForm?: boolean; page?: string }) {
  const [state, formAction, pending] = useActionState<SupportFormState, FormData>(createTicket, {});
  const { errors, markEdited } = useLiveErrors(state.fieldErrors);

  if (state.ok) return <Notice tone="success">{state.ok}</Notice>;

  return (
    <form onSubmit={submitKeepingFields(formAction)} onChange={markEdited} noValidate className="space-y-5">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <input type="hidden" name="page" value={page ?? ""} />
      {/* Honeypot: hidden from people, filled by bots */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {publicForm && (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Your name" name="name" autoComplete="name" error={errors.name} />
            <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@company.com" error={errors.email} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Business" name="company" autoComplete="organization" hint={<span className="text-xs text-ink-soft">Optional</span>} />
            <Field label="Phone" name="phone" type="tel" autoComplete="tel" hint={<span className="text-xs text-ink-soft">Optional</span>} />
          </div>
        </>
      )}
      <Select label="What’s this about?" name="category" options={TICKET_CATEGORIES} placeholder="Choose one" defaultValue="" error={errors.category} />
      <Field label="Summary" name="subject" maxLength={150} placeholder="Can’t confirm order #1043" error={errors.subject} />
      <TextArea
        label="Details"
        name="message"
        rows={6}
        maxLength={MAX_MESSAGE}
        placeholder="What were you trying to do, and what happened instead?"
        error={errors.message}
      />
      <div className="pt-1 sm:max-w-64">
        <SubmitButton pending={pending} pendingLabel="Sending…">
          Send request
        </SubmitButton>
      </div>
    </form>
  );
}

/** Buyer/vendor reply on their own ticket. */
export function ReplyForm({ ticketId, closed }: { ticketId: string; closed: boolean }) {
  const [state, formAction, pending] = useActionState<SupportFormState, FormData>(replyToTicket, {});
  return <ThreadReply state={state} formAction={formAction} pending={pending} ticketId={ticketId} label={closed ? "Reopen with a reply" : "Reply"} button="Send reply" />;
}

/** Spectra reply with a status; replying defaults to "Answered" (waiting on them). */
export function StaffReplyForm({ ticketId, status }: { ticketId: string; status: TicketStatus }) {
  const [state, formAction, pending] = useActionState<SupportFormState, FormData>(staffReply, {});
  const options = (Object.keys(TICKET_STATUSES) as TicketStatus[]).map((value) => ({ value, label: `${TICKET_STATUSES[value].label} · ${TICKET_STATUSES[value].note.toLowerCase()}` }));
  return (
    <ThreadReply state={state} formAction={formAction} pending={pending} ticketId={ticketId} label="Reply to customer" button="Save">
      <Select label="Then mark it" name="status" options={options} defaultValue={status === "open" ? "waiting" : status} />
    </ThreadReply>
  );
}

function ThreadReply({
  state,
  formAction,
  pending,
  ticketId,
  label,
  button,
  children,
}: {
  state: SupportFormState;
  formAction: (fd: FormData) => void;
  pending: boolean;
  ticketId: string;
  label: string;
  button: string;
  children?: React.ReactNode;
}) {
  const { errors, markEdited } = useLiveErrors(state.fieldErrors);
  const form = useRef<HTMLFormElement>(null);
  // Clear the box once a reply goes through
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} onSubmit={submitKeepingFields(formAction)} onChange={markEdited} noValidate className="space-y-4">
      {state.ok && <Notice tone="success">{state.ok}</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <input type="hidden" name="ticket_id" value={ticketId} />
      <TextArea label={label} name="body" rows={5} maxLength={MAX_MESSAGE} error={errors.body} />
      {children}
      <div className="sm:max-w-56">
        <SubmitButton pending={pending} pendingLabel="Sending…">
          {button}
        </SubmitButton>
      </div>
    </form>
  );
}

// Submitting through onSubmit keeps what was typed when the server sends back an
// error (a plain <form action> resets every field after each submit).
function submitKeepingFields(formAction: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  };
}
