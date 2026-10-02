-- Invoices. Vendors brand their invoices (logo, payment instructions, terms,
-- turnaround) from Account, and can take a percentage off any order.

-- ── Vendor invoice settings ──────────────────────────────────────────────────
alter table companies add column if not exists logo_url           text;  -- public URL in product-images/<company id>/
alter table companies add column if not exists invoice_payable_to text;  -- "Make checks payable to…" / payment instructions
alter table companies add column if not exists invoice_terms      text;  -- delivery terms, order minimums/maximums
alter table companies add column if not exists invoice_turnaround text;  -- e.g. "1–2 days Mat-Su, Anchorage Tue–Wed"
alter table companies add column if not exists invoice_payment_terms text; -- e.g. "COD", "Net 15"

-- ── Order discount ───────────────────────────────────────────────────────────
alter table orders add column if not exists discount_percent numeric(5,2) not null default 0;
alter table orders drop constraint if exists orders_discount_percent_check;
alter table orders add constraint orders_discount_percent_check check (discount_percent >= 0 and discount_percent <= 100);

-- What the buyer owes: items, less the discount, plus any shipping.
-- Generated so every report and email reads the same number.
alter table orders add column if not exists total numeric(10,2)
  generated always as (round(subtotal * (100 - discount_percent) / 100, 2) + coalesce(shipping_cost, 0)) stored;

-- ── Platform settings (admin Tools) ──────────────────────────────────────────
-- One row per setting. `invoice_template` picks the invoice design every
-- vendor and buyer sees; keys are defined in lib/invoice-templates.ts.
create table if not exists platform_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);
alter table platform_settings enable row level security;
revoke all on platform_settings from anon, authenticated;

insert into platform_settings (key, value) values ('invoice_template', 'ledger')
on conflict (key) do nothing;
