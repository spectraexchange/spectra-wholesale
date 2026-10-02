// Subscription vocabulary. Statuses must match vendor_billing_status_check.
export const SUBSCRIPTION_STATUSES = {
  trial: { label: "Trial", tone: "text-info" },
  active: { label: "Active", tone: "text-success" },
  past_due: { label: "Past due", tone: "text-pending" },
  deactivated: { label: "Deactivated", tone: "text-danger" },
} as const;
export type SubscriptionStatus = keyof typeof SUBSCRIPTION_STATUSES;

export const PAYMENT_METHODS = ["Check", "Cash", "ACH / bank transfer", "Card", "Other"] as const;

export type Subscription = {
  id: string;
  company_id: string;
  status: SubscriptionStatus;
  monthly_price: number | null;
  trial_ends_on: string | null;
  next_due_date: string | null;
  notes: string | null;
};

export type Payment = {
  id: string;
  company_id: string;
  amount: number;
  date: string;
  method: string | null;
  note: string | null;
  created_at: string;
};

// Plain DATE columns: compare and format without time-zone shifts.
export function alaskaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Anchorage" }).format(new Date()); // YYYY-MM-DD
}
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
export const formatDate = (date: string) => shortDate.format(new Date(`${date}T00:00:00Z`));
