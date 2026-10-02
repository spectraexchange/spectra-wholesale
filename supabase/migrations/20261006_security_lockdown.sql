-- Security lockdown. The app reads and writes every table through the server
-- (service role) after its own permission checks, so the browser's public key
-- never needs direct table access. Old-build RLS policies let any signed-in user
-- promote themselves to super_admin, move into another company, read every
-- company's contact details, and overwrite other vendors' files.

-- ── 1. Public tables: no direct access for anon / authenticated ───────────────
do $$
declare
  r record;
begin
  for r in select tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from anon, authenticated, public;
grant execute on all functions in schema public to service_role;

-- Tables, sequences and functions created later start locked too
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated, public;

-- ── 2. Storage: only server-issued signed upload links can write ──────────────
do $$
declare
  r record;
begin
  for r in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

-- Old build's license-upload bucket: unused and accepted anonymous uploads
update storage.buckets set public = false where id = 'access-requests';

-- ── 3. Signups never create companies or grant roles ─────────────────────────
-- Accounts come from approved access requests, which set role + company
-- server-side after the trigger runs. A stray signup gets a bare profile with
-- no company, which the app treats as having no access.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'buyer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- Should return no rows: no policies left on public tables or storage objects
select schemaname, tablename, policyname from pg_policies
where schemaname in ('public', 'storage') and tablename <> 'buckets';
