-- Subscriptions for every company (buyers and vendors), payment details, and
-- an audit log of admin actions. vendor_billing / billing_payments came from
-- the old build and are empty; this reshapes them for the new admin.

-- ── Subscriptions (one row per company) ───────────────────────────────────
alter table vendor_billing add column if not exists monthly_price numeric(10,2);
alter table vendor_billing add column if not exists trial_ends_on date;

alter table vendor_billing drop constraint if exists vendor_billing_status_check;
update vendor_billing set status = 'deactivated' where status in ('suspended', 'cancelled');
alter table vendor_billing add constraint vendor_billing_status_check
  check (status in ('trial', 'active', 'past_due', 'deactivated'));

create unique index if not exists vendor_billing_company_id_key on vendor_billing (company_id);

-- Every existing company starts on a trial record (paused companies as deactivated)
insert into vendor_billing (company_id, plan, status)
select c.id, 'standard', case when c.is_active then 'trial' else 'deactivated' end
from companies c
where not exists (select 1 from vendor_billing b where b.company_id = c.id);

-- ── Payments ───────────────────────────────────────────────────────────────
alter table billing_payments add column if not exists method text;
alter table billing_payments add column if not exists recorded_by uuid references profiles(id) on delete set null;

-- ── Admin audit log (server-only: RLS on, no policies) ─────────────────────
create table if not exists admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references profiles(id) on delete set null,
  action      text not null,
  company_id  uuid references companies(id) on delete cascade,
  user_id     uuid references profiles(id) on delete set null,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
alter table admin_audit_log enable row level security;
create index if not exists admin_audit_log_company_idx on admin_audit_log (company_id, created_at desc);
