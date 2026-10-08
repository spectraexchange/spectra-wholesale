// Support ticket vocabulary. Values must match the check constraints on `tickets`
// (supabase/migrations/20261008_errors_and_support.sql).

export const TICKET_CATEGORIES = [
  { value: "account", label: "Account or sign-in" },
  { value: "orders", label: "Orders" },
  { value: "products", label: "Products or catalog" },
  { value: "billing", label: "Billing" },
  { value: "problem", label: "Something isn’t working" },
  { value: "other", label: "Something else" },
] as const;

export const TICKET_STATUSES = {
  open: { label: "Open", note: "Waiting on Spectra" },
  waiting: { label: "Answered", note: "Waiting on you" },
  closed: { label: "Closed", note: "Resolved" },
} as const;
export type TicketStatus = keyof typeof TICKET_STATUSES;

export const categoryName = (value: string) => TICKET_CATEGORIES.find((c) => c.value === value)?.label ?? value;
export const ticketRef = (number: number) => `#${number}`;

export type Ticket = {
  id: string;
  number: number;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  company_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  category: string;
  subject: string;
  status: TicketStatus;
  page: string | null;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  created_at: string;
  author_id: string | null;
  is_staff: boolean;
  body: string;
};

export const MAX_MESSAGE = 5000;
