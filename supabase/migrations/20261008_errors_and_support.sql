-- Error log + support tickets. (The old build's `error_logs` and
-- `support_tickets` tables are unused and left as they are.)

-- ── Errors ───────────────────────────────────────────────────────────────────
-- One row per occurrence. `fingerprint` groups repeats of the same error so the
-- admin page shows "Couldn't load cart · 14 times" instead of 14 rows.
create table if not exists site_errors (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  source       text not null check (source in ('server', 'browser', 'email')),
  message      text not null,
  detail       text,           -- stack trace or extra context
  route        text,           -- route pattern, e.g. /seller/orders/[id]
  path         text,           -- actual URL path
  digest       text,           -- Next.js error id shown to the user
  fingerprint  text not null,
  user_id      uuid references profiles(id) on delete set null,
  user_agent   text,
  resolved_at  timestamptz
);
create index if not exists site_errors_created_idx on site_errors (created_at desc);
create index if not exists site_errors_fingerprint_idx on site_errors (fingerprint, created_at desc);

-- ── Support ──────────────────────────────────────────────────────────────────
-- Tickets come from signed-in users (user_id set) or the public form on the
-- login page (name/email only). Replies are a thread in ticket_messages.
create table if not exists tickets (
  id               uuid primary key default gen_random_uuid(),
  number           bigint generated always as identity (start with 1001) unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  user_id          uuid references profiles(id) on delete set null,
  company_id       uuid references companies(id) on delete set null,
  name             text not null,
  email            text not null,
  phone            text,
  company          text,       -- as typed on the public form
  category         text not null check (category in ('account', 'orders', 'products', 'billing', 'problem', 'other')),
  subject          text not null,
  status           text not null default 'open' check (status in ('open', 'waiting', 'closed')),
  page             text        -- where they were when they asked
);
create index if not exists tickets_status_idx on tickets (status, updated_at desc);
create index if not exists tickets_user_idx on tickets (user_id, updated_at desc);

create table if not exists ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references tickets(id) on delete cascade,
  created_at  timestamptz not null default now(),
  author_id   uuid references profiles(id) on delete set null,
  is_staff    boolean not null default false,
  body        text not null
);
create index if not exists ticket_messages_ticket_idx on ticket_messages (ticket_id, created_at);

-- Server-only, like every other table (see 20261006_security_lockdown.sql)
alter table site_errors enable row level security;
alter table tickets enable row level security;
alter table ticket_messages enable row level security;
revoke all on site_errors, tickets, ticket_messages from anon, authenticated;
