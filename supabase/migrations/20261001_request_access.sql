-- Request-access → approval carries every submitted field into the new account.
-- Additive only: new nullable columns, relaxed NOT NULLs on legacy URL columns,
-- and a private bucket for license documents. Safe to run on the live DB.

-- ── access_requests: everything the form collects ──────────────────────────
alter table access_requests add column if not exists first_name            text;
alter table access_requests add column if not exists last_name             text;
alter table access_requests add column if not exists address               text;
alter table access_requests add column if not exists city                  text;
alter table access_requests add column if not exists zip                   text;
alter table access_requests add column if not exists receiving_hours       text;
alter table access_requests add column if not exists delivery_instructions text;
alter table access_requests add column if not exists mj_license_path       text;  -- object path in license-documents bucket
alter table access_requests add column if not exists biz_license_path      text;
alter table access_requests add column if not exists company_id            uuid references companies(id);
alter table access_requests add column if not exists reviewed_at           timestamptz;
alter table access_requests add column if not exists reviewed_by           uuid references profiles(id);

-- Legacy public-URL columns; new requests store private paths instead.
alter table access_requests alter column biz_license_url drop not null;
alter table access_requests alter column mj_license_url  drop not null;

-- ── companies: destination for business + delivery + license data ──────────
alter table companies add column if not exists zip              text;
alter table companies add column if not exists receiving_hours  text;
alter table companies add column if not exists mj_license_path  text;
alter table companies add column if not exists biz_license_path text;

-- ── Private bucket for license documents (served via short-lived signed URLs) ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'license-documents',
  'license-documents',
  false,
  10485760,  -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp']
)
on conflict (id) do nothing;
