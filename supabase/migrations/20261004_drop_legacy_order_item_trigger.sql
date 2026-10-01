-- The old build left a trigger on order_items that subtracts stock on every
-- insert. place_order() already adjusts stock atomically (and cancel_order()
-- restores it), so the legacy trigger double-counts. Drop every user-defined
-- trigger on order_items.

do $$
declare
  t record;
begin
  for t in
    select tgname from pg_trigger
    where tgrelid = 'public.order_items'::regclass and not tgisinternal
  loop
    execute format('drop trigger %I on public.order_items', t.tgname);
  end loop;
end $$;

-- Should return no rows
select tgname from pg_trigger
where tgrelid = 'public.order_items'::regclass and not tgisinternal;
