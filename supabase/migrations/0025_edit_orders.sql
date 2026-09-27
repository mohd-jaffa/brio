-- ============================================================
-- An open order can be changed, and moved to any status in one step (the
-- user, 2026-09-27; plan §139.11.8 as revised, §139.11.13).
--
-- 1. `order_status_next`: an open order may move to any other open status —
--    on, or back when it was moved by mistake — or straight to Delivered or
--    Cancelled. Out for delivery is still for a delivery only, and Delivered
--    and Cancelled stay final: stock has followed them (§133.3 C5, BUG-04).
--    A move between open statuses posts no stock: the reservation stands
--    until the order is delivered or cancelled, and `change_order_status`
--    (0016) already posts only for those two.
-- 2. `order_items.position`: the order the lines were put in. An edit rewrites
--    some lines and adds others, and a row's place on disk is not an order, so
--    the bill and the order screen read the lines by this.
-- 3. `update_order(order, changes)`: an open order's items, customer,
--    handover, discounts and charges and notes, changed in one transaction.
--    The reservation follows each product's change in quantity, checked
--    against stock like a new order (C4); the totals must add up, and may not
--    come to less than has been paid; the payment status is derived again.
--    `security invoker`, so row-level security applies.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Where an order may go next
-- ------------------------------------------------------------

create or replace function public.order_status_next(p_status text, p_delivery_type text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'PENDING'     then case when p_delivery_type = 'DELIVERY'
                                 then array['IN_PROGRESS', 'READY', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']
                                 else array['IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED'] end
    when 'IN_PROGRESS' then case when p_delivery_type = 'DELIVERY'
                                 then array['READY', 'IN_TRANSIT', 'DELIVERED', 'PENDING', 'CANCELLED']
                                 else array['READY', 'DELIVERED', 'PENDING', 'CANCELLED'] end
    when 'READY'       then case when p_delivery_type = 'DELIVERY'
                                 then array['IN_TRANSIT', 'DELIVERED', 'IN_PROGRESS', 'PENDING', 'CANCELLED']
                                 else array['DELIVERED', 'IN_PROGRESS', 'PENDING', 'CANCELLED'] end
    when 'IN_TRANSIT'  then array['DELIVERED', 'READY', 'IN_PROGRESS', 'PENDING', 'CANCELLED']
    else array[]::text[]
  end;
$$;

-- ------------------------------------------------------------
-- 2. The order of an order's lines
-- ------------------------------------------------------------

-- Numbered as the rows stand now, which is the order every order was read in
-- until today; every line inserted from here on takes the next number, in the
-- order its statement inserts it (create_order and update_order both insert
-- in the order the lines were given).
alter table public.order_items add column position bigint generated always as identity;

create index order_items_order_position_idx on public.order_items (order_id, position);

-- ------------------------------------------------------------
-- 3. update_order
-- ------------------------------------------------------------

-- `p_order` is the order as the server priced it (src/features/orders/edit.ts):
--   { customer_id, delivery_type, delivery_date, delivery_address,
--     delivery_google_maps_link, notes, subtotal, discount, delivery_charge,
--     tax, total,
--     items: [{ item_id, product_id, product_name, unit_price, quantity, subtotal, notes }],
--     adjustments: [{ type, name, amount }] }
-- A line with an `item_id` is that line of this order, kept at its own name
-- and price; one without is new, and goes after the kept ones. A line of the
-- order that is not in `items` is taken off.
create or replace function public.update_order(p_order_id uuid, p_order jsonb)
returns setof public.orders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  business uuid := public.current_profile_bakery_id();
  current_order public.orders;
  lines jsonb := coalesce(p_order -> 'items', '[]'::jsonb);
  adjustments jsonb := coalesce(p_order -> 'adjustments', '[]'::jsonb);
  order_total integer := (p_order ->> 'total')::integer;
  new_date timestamptz := (p_order ->> 'delivery_date')::timestamptz;
  zone text;
  paid integer;
  changes jsonb;
  shortfalls jsonb;
begin
  select * into current_order
    from public.orders as o
   where o.bakery_id = business and o.id = p_order_id
     for no key update;

  if not found then
    raise exception 'no such order' using errcode = 'P0001', hint = 'RECORD_NOT_FOUND';
  end if;
  -- Stock has followed a delivered or cancelled order; changing it would not.
  if current_order.status not in ('PENDING', 'IN_PROGRESS', 'READY', 'IN_TRANSIT') then
    raise exception 'order is final' using errcode = 'P0001', hint = 'ORDER_NOT_EDITABLE';
  end if;
  -- Out for delivery is a delivery's status only (§139.11.8).
  if current_order.status = 'IN_TRANSIT' and p_order ->> 'delivery_type' is distinct from 'DELIVERY' then
    raise exception 'out for delivery' using errcode = 'P0001', hint = 'ORDER_IN_TRANSIT_PICKUP';
  end if;

  -- The totals must be the sum of their parts, as for a new order (0015).
  if coalesce(
     jsonb_array_length(lines) = 0
     or exists (
       select 1 from jsonb_array_elements(lines) as line
        where (line ->> 'unit_price')::bigint * (line ->> 'quantity')::bigint <> (line ->> 'subtotal')::bigint
     )
     or (p_order ->> 'subtotal')::bigint <> (select sum((line ->> 'subtotal')::bigint) from jsonb_array_elements(lines) as line)
     or (p_order ->> 'discount')::bigint <> (
          select coalesce(sum((a ->> 'amount')::bigint), 0) from jsonb_array_elements(adjustments) as a where a ->> 'type' = 'DISCOUNT')
     or (p_order ->> 'delivery_charge')::bigint <> (
          select coalesce(sum((a ->> 'amount')::bigint), 0) from jsonb_array_elements(adjustments) as a where a ->> 'type' = 'CHARGE')
     or order_total <> (p_order ->> 'subtotal')::integer - (p_order ->> 'discount')::integer
                       + (p_order ->> 'delivery_charge')::integer + (p_order ->> 'tax')::integer,
     true)
  then
    raise exception 'order totals do not add up' using errcode = 'P0001', hint = 'VALIDATION_ERROR';
  end if;

  -- A kept line is named once, and is a line of this order as it stands, at
  -- the price it was ordered at. Anything else means the order changed
  -- somewhere else since it was opened.
  if (select count(*) <> count(distinct line ->> 'item_id')
        from jsonb_array_elements(lines) as line
       where line ->> 'item_id' is not null)
     or exists (
       select 1 from jsonb_array_elements(lines) as line
        where line ->> 'item_id' is not null
          and not exists (
            select 1 from public.order_items as i
             where i.order_id = p_order_id
               and i.id = (line ->> 'item_id')::uuid
               and i.product_id is not distinct from (line ->> 'product_id')::uuid
               and i.unit_price = (line ->> 'unit_price')::integer
          )
     )
  then
    raise exception 'the order changed' using errcode = 'P0001', hint = 'ORDER_CHANGED';
  end if;

  -- Never less than has been paid: a payment is not taken back by an edit.
  select coalesce(sum(p.amount), 0) into paid
    from public.payments as p
   where p.bakery_id = business and p.order_id = p_order_id;
  if paid > order_total then
    raise exception 'total below what was paid' using errcode = 'P0001', hint = 'ORDER_TOTAL_BELOW_PAID';
  end if;

  -- How much more or less of each product the order will hold.
  with wanted as (
    select (line ->> 'product_id')::uuid as product_id, sum((line ->> 'quantity')::integer) as quantity
      from jsonb_array_elements(lines) as line
     where line ->> 'product_id' is not null
     group by 1
  ),
  held as (
    select i.product_id, sum(i.quantity) as quantity
      from public.order_items as i
     where i.order_id = p_order_id and i.product_id is not null
     group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'product_id', coalesce(w.product_id, h.product_id),
           'quantity', coalesce(w.quantity, 0) - coalesce(h.quantity, 0))), '[]'::jsonb)
    into changes
    from wanted as w
    full join held as h on h.product_id = w.product_id
   where coalesce(w.quantity, 0) <> coalesce(h.quantity, 0);

  -- The oversell guard, for what the order asks for beyond what it holds. The
  -- products are locked first, in one order, as create_order locks them.
  perform 1
     from public.products as p
    where p.bakery_id = business
      and p.id in (select (c ->> 'product_id')::uuid from jsonb_array_elements(changes) as c)
    order by p.id
      for no key update;

  select jsonb_agg(jsonb_build_object(
           'productId', s.product_id, 'name', s.product_name, 'available', s.available, 'requested', s.requested))
    into shortfalls
    from public.stock_shortfalls((
      select coalesce(jsonb_agg(c), '[]'::jsonb)
        from jsonb_array_elements(changes) as c
       where (c ->> 'quantity')::integer > 0
    )) as s;
  if shortfalls is not null then
    raise exception 'not enough stock' using
      errcode = 'P0001',
      hint = 'ORDER_INSUFFICIENT_STOCK',
      detail = jsonb_build_object('shortfalls', shortfalls)::text;
  end if;

  -- The reservation follows: more of a product reserves more (−), less
  -- releases it (+), so delivery or cancellation later settles exactly what
  -- the order holds then. A custom line moves none (§139.11.7).
  insert into public.inventory_transactions (bakery_id, product_id, type, quantity, reference_type, reference_id)
  select business, (c ->> 'product_id')::uuid, 'ORDER_RESERVATION', -(c ->> 'quantity')::integer, 'ORDER', p_order_id::text
    from jsonb_array_elements(changes) as c;

  -- The lines: one left out goes, a kept one takes its quantity and note, and
  -- a new one goes after them, in the order given.
  delete from public.order_items as i
   where i.order_id = p_order_id
     and i.id not in (
       select (line ->> 'item_id')::uuid from jsonb_array_elements(lines) as line where line ->> 'item_id' is not null
     );

  update public.order_items as i
     set quantity = (line ->> 'quantity')::integer,
         subtotal = (line ->> 'subtotal')::integer,
         notes = nullif(line ->> 'notes', '')
    from jsonb_array_elements(lines) as line
   where line ->> 'item_id' is not null
     and i.order_id = p_order_id
     and i.id = (line ->> 'item_id')::uuid;

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, subtotal, notes)
  select p_order_id,
         (line ->> 'product_id')::uuid,
         line ->> 'product_name',
         (line ->> 'unit_price')::integer,
         (line ->> 'quantity')::integer,
         (line ->> 'subtotal')::integer,
         nullif(line ->> 'notes', '')
    from jsonb_array_elements(lines) with ordinality as entry(line, position)
   where line ->> 'item_id' is null
   order by position;

  delete from public.order_adjustments as a where a.order_id = p_order_id;
  insert into public.order_adjustments (order_id, type, name, amount)
  select p_order_id, a ->> 'type', a ->> 'name', (a ->> 'amount')::integer
    from jsonb_array_elements(adjustments) with ordinality as entry(a, position)
   order by position;

  -- Due on another day: the due and overdue notices are for the new day (0023).
  select b.timezone into zone from public.bakeries as b where b.id = business;

  update public.orders as o
     set customer_id = (p_order ->> 'customer_id')::uuid,
         delivery_type = p_order ->> 'delivery_type',
         delivery_date = new_date,
         delivery_address = nullif(p_order ->> 'delivery_address', ''),
         delivery_google_maps_link = nullif(p_order ->> 'delivery_google_maps_link', ''),
         notes = nullif(p_order ->> 'notes', ''),
         subtotal = (p_order ->> 'subtotal')::integer,
         discount = (p_order ->> 'discount')::integer,
         delivery_charge = (p_order ->> 'delivery_charge')::integer,
         tax = (p_order ->> 'tax')::integer,
         total = order_total,
         -- The payments decide it, as they do on every payment (0015).
         payment_status = case
                            when paid >= order_total then 'PAID'
                            when paid > 0 then 'PARTIALLY_PAID'
                            else 'UNPAID'
                          end,
         due_notified_at = case
                             when (new_date at time zone zone)::date = (o.delivery_date at time zone zone)::date
                             then o.due_notified_at
                           end,
         overdue_notified_at = case
                                 when (new_date at time zone zone)::date = (o.delivery_date at time zone zone)::date
                                 then o.overdue_notified_at
                               end
   where o.id = p_order_id
  returning * into current_order;

  return next current_order;
end;
$$;

revoke all on function public.update_order(uuid, jsonb) from public, anon;
grant execute on function public.update_order(uuid, jsonb) to authenticated;
