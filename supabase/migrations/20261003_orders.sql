-- Atomic checkout and cancellation. Both run as one transaction: either the
-- whole order (rows, stock, cart) changes or nothing does. Prices always come
-- from `products`, never from the client. Called only from server actions via
-- the service role, after the app has verified who the user is.

create or replace function public.place_order(
  p_buyer_profile_id uuid,
  p_seller_company_id uuid,
  p_notes text
)
returns table (order_id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_buyer_company uuid;
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(10,2);
  v_line record;
begin
  select company_id into v_buyer_company
  from profiles
  where id = p_buyer_profile_id and role in ('buyer', 'buyer_admin');
  if v_buyer_company is null then
    raise exception 'not_a_buyer';
  end if;

  -- Lock this vendor's products in the cart so concurrent orders can't oversell.
  perform 1
  from products p
  join cart_items c on c.product_id = p.id
  where c.buyer_profile_id = p_buyer_profile_id and p.seller_company_id = p_seller_company_id
  for update of p;

  if not found then
    raise exception 'cart_empty';
  end if;

  for v_line in
    select p.name, p.is_active, p.is_archived, p.stock_qty, coalesce(p.min_order_qty, 1) as min_qty, c.quantity
    from cart_items c
    join products p on p.id = c.product_id
    where c.buyer_profile_id = p_buyer_profile_id and p.seller_company_id = p_seller_company_id
  loop
    if not v_line.is_active or v_line.is_archived then
      raise exception 'unavailable:%', v_line.name;
    elsif v_line.quantity > v_line.stock_qty then
      raise exception 'stock:%:%', v_line.name, v_line.stock_qty;
    elsif v_line.quantity < v_line.min_qty then
      raise exception 'minimum:%:%', v_line.name, v_line.min_qty;
    end if;
  end loop;

  select sum(round(p.price_per_unit * c.quantity, 2)) into v_subtotal
  from cart_items c
  join products p on p.id = c.product_id
  where c.buyer_profile_id = p_buyer_profile_id and p.seller_company_id = p_seller_company_id;

  insert into orders (buyer_company_id, seller_company_id, status, notes, subtotal)
  values (v_buyer_company, p_seller_company_id, 'pending', nullif(trim(p_notes), ''), v_subtotal)
  returning id, orders.order_number into v_order_id, v_order_number;

  insert into order_items (order_id, product_id, product_name, product_category, sku, quantity, unit, price_per_unit, line_total)
  select v_order_id, p.id, p.name, p.category, p.sku, c.quantity, p.unit, p.price_per_unit, round(p.price_per_unit * c.quantity, 2)
  from cart_items c
  join products p on p.id = c.product_id
  where c.buyer_profile_id = p_buyer_profile_id and p.seller_company_id = p_seller_company_id;

  update products p
  set stock_qty = p.stock_qty - c.quantity, updated_at = now()
  from cart_items c
  where c.product_id = p.id and c.buyer_profile_id = p_buyer_profile_id and p.seller_company_id = p_seller_company_id;

  delete from cart_items c
  using products p
  where p.id = c.product_id and c.buyer_profile_id = p_buyer_profile_id and p.seller_company_id = p_seller_company_id;

  return query select v_order_id, v_order_number;
end;
$$;

-- Cancel an order that hasn't been delivered and put its stock back.
create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from orders where id = p_order_id for update;
  if v_status is null then
    raise exception 'order_not_found';
  elsif v_status in ('delivered', 'cancelled') then
    raise exception 'cannot_cancel:%', v_status;
  end if;

  update products p
  set stock_qty = p.stock_qty + i.quantity, updated_at = now()
  from order_items i
  where i.order_id = p_order_id and i.product_id = p.id;

  update orders set status = 'cancelled', updated_at = now() where id = p_order_id;
end;
$$;

-- Server-only: the app calls these with the service role after its own checks.
revoke execute on function public.place_order(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.cancel_order(uuid) from public, anon, authenticated;
grant execute on function public.place_order(uuid, uuid, text) to service_role;
grant execute on function public.cancel_order(uuid) to service_role;
