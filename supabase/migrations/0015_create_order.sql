-- ============================================================
-- Placing an order is one transaction (plan §139.12 `…_order_rpc`; tracker
-- R3.1, R3.2, R3.3, R3.12).
--
-- 1. Order numbers ORD-1001, ORD-1002, … from a counter on the business,
--    taken inside the insert — sequential, never reused, and never two alike
--    (BUG-08). A rolled-back order rolls its number back with it.
-- 2. An idempotency key on orders and payments: the same request sent twice —
--    a double tap, a retry after a dropped connection — makes one row (§133.3
--    C2). No new table; the key is a column (§139.12).
-- 3. The oversell guard (§133.3 C4, §21): an order may not reserve more of a
--    stocked product than there is. A product is *stocked* once anything but
--    an order has moved its stock — a stock in, an adjustment, wastage or a
--    return. A product nobody stocks is made to order and is never refused
--    (the user's decision, 2026-09-25).
-- 4. Payments decide the payment status (BUG-02, BUG-06, §139.11.9): it is
--    derived from the payments on every change, and a payment may not take an
--    order past its total. Both hold for every write, not only the app's.
-- 5. `create_order(order, key)`: the order, its lines, its adjustments, its
--    stock reservations and the payment taken with it, all or nothing (§133.3
--    C1, BUG-09). `security invoker`, so row-level security still applies.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Order numbers
-- ------------------------------------------------------------

alter table public.bakeries
  add column next_order_number integer not null default 1001
  constraint bakeries_next_order_number_positive check (next_order_number > 0);

-- Every order gets its number here, however it was inserted, so no insert can
-- choose a number the counter will reach later. Security definer because only
-- the server may change `bakeries`; it touches nothing but this business's
-- counter, and refuses to reach another business's.
create or replace function public.assign_order_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  number integer;
begin
  if auth.uid() is not null and new.bakery_id is distinct from public.current_profile_bakery_id() then
    raise exception 'not this caller''s business' using errcode = '42501';
  end if;

  update public.bakeries
     set next_order_number = next_order_number + 1
   where id = new.bakery_id
  returning next_order_number - 1 into number;

  if number is null then
    raise exception 'no such business' using errcode = '23503';
  end if;

  new.order_number := 'ORD-' || number;
  return new;
end;
$$;

revoke all on function public.assign_order_number() from public, anon, authenticated;

create trigger assign_order_number
before insert on public.orders
for each row
execute function public.assign_order_number();

-- ------------------------------------------------------------
-- 2. Idempotency keys
-- ------------------------------------------------------------

alter table public.orders add column idempotency_key uuid;
alter table public.orders
  add constraint orders_bakery_idempotency_key unique (bakery_id, idempotency_key);

alter table public.payments add column idempotency_key uuid;
alter table public.payments
  add constraint payments_bakery_idempotency_key unique (bakery_id, idempotency_key);

-- ------------------------------------------------------------
-- 3. The oversell guard
-- ------------------------------------------------------------

-- The stocked products these lines ask for more of than there is, with what
-- there is. Lines are `[{ product_id, quantity }]`; a line with no product —
-- a custom item — is ignored, and so is a product never stocked. The estimate
-- asks this without writing (R3.13); create_order asks it after locking.
create or replace function public.stock_shortfalls(p_lines jsonb)
returns table (product_id uuid, product_name text, available integer, requested integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with wanted as (
    select (line ->> 'product_id')::uuid as product_id,
           sum((line ->> 'quantity')::integer) as requested
      from jsonb_array_elements(p_lines) as line
     where line ->> 'product_id' is not null
     group by 1
  ),
  stock as (
    select t.product_id,
           sum(t.quantity) as balance,
           bool_or(t.type in ('STOCK_IN', 'ADJUSTMENT', 'WASTAGE', 'RETURN')) as stocked
      from public.inventory_transactions as t
      join wanted as w on w.product_id = t.product_id
     where t.bakery_id = public.current_profile_bakery_id()
     group by t.product_id
  )
  select w.product_id, p.name, greatest(s.balance, 0)::integer, w.requested::integer
    from wanted as w
    join stock as s on s.product_id = w.product_id and s.stocked
    join public.products as p on p.id = w.product_id
   where s.balance < w.requested
   order by p.name;
$$;

-- ------------------------------------------------------------
-- 4. Payments decide the payment status
-- ------------------------------------------------------------

-- A payment may not take an order past its total. The order row is locked
-- first, so two payments at once are counted one after the other.
create or replace function public.check_payment_fits()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  order_total integer;
  already_paid integer;
begin
  select o.total into order_total
    from public.orders as o
   where o.bakery_id = new.bakery_id and o.id = new.order_id
     for no key update;

  -- No such order: the foreign key refuses the row.
  if not found then
    return new;
  end if;

  select coalesce(sum(p.amount), 0) into already_paid
    from public.payments as p
   where p.bakery_id = new.bakery_id and p.order_id = new.order_id and p.id <> new.id;

  if already_paid + new.amount > order_total then
    raise exception 'payment exceeds the balance' using errcode = 'P0001', hint = 'PAYMENT_EXCEEDS_BALANCE';
  end if;
  return new;
end;
$$;

create or replace function public.sync_order_payment_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  business uuid := coalesce(new.bakery_id, old.bakery_id);
  target uuid := coalesce(new.order_id, old.order_id);
begin
  update public.orders as o
     set payment_status = derived.status
    from (
      select case
               when coalesce(sum(p.amount), 0) >= o2.total then 'PAID'
               when coalesce(sum(p.amount), 0) > 0 then 'PARTIALLY_PAID'
               else 'UNPAID'
             end as status
        from public.orders as o2
        left join public.payments as p on p.bakery_id = o2.bakery_id and p.order_id = o2.id
       where o2.bakery_id = business and o2.id = target
       group by o2.total
    ) as derived
   where o.bakery_id = business
     and o.id = target
     and o.payment_status is distinct from derived.status;
  return null;
end;
$$;

revoke all on function public.check_payment_fits() from public, anon, authenticated;
revoke all on function public.sync_order_payment_status() from public, anon, authenticated;

create trigger check_payment_fits
before insert or update of amount, order_id on public.payments
for each row
execute function public.check_payment_fits();

create trigger sync_order_payment_status
after insert or update or delete on public.payments
for each row
execute function public.sync_order_payment_status();

-- Orders marked paid before payments decided it recorded no payment (BUG-02).
-- What the owner said was paid is recorded now, so the derived status agrees
-- with it rather than turning those orders unpaid. A part-paid order with no
-- payment is left as it is: nothing says how much was paid.
insert into public.payments (bakery_id, order_id, amount, payment_method, reference, paid_at)
select o.bakery_id,
       o.id,
       o.total - coalesce(paid.amount, 0),
       coalesce(o.payment_method, 'OTHER'),
       o.payment_reference,
       o.created_at
  from public.orders as o
  left join (
    select p.order_id, sum(p.amount) as amount
      from public.payments as p
     group by p.order_id
  ) as paid on paid.order_id = o.id
 where o.payment_status = 'PAID'
   and o.status <> 'CANCELLED'
   and o.total > coalesce(paid.amount, 0);

-- ------------------------------------------------------------
-- 5. create_order
-- ------------------------------------------------------------

-- `p_order` is the order the server priced (src/features/orders/pricing.ts):
--   { customer_id, delivery_type, delivery_date, delivery_address,
--     delivery_google_maps_link, notes, subtotal, discount, delivery_charge,
--     tax, total,
--     items: [{ product_id, product_name, unit_price, quantity, subtotal, notes }],
--     adjustments: [{ type, name, amount }],
--     payment: { amount, method, reference } | null }
-- Returns the order and whether this call created it: a repeat of a key
-- already used returns that order and changes nothing.
create or replace function public.create_order(p_order jsonb, p_idempotency_key uuid)
returns table (order_id uuid, created boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  business uuid := public.current_profile_bakery_id();
  new_order uuid;
  shortfalls jsonb;
  lines jsonb := coalesce(p_order -> 'items', '[]'::jsonb);
  adjustments jsonb := coalesce(p_order -> 'adjustments', '[]'::jsonb);
  payment jsonb := nullif(p_order -> 'payment', 'null'::jsonb);
  order_total integer := (p_order ->> 'total')::integer;
begin
  if business is null then
    raise exception 'no business for this caller' using errcode = '42501';
  end if;
  if p_idempotency_key is null then
    raise exception 'an order needs its idempotency key' using errcode = 'P0001', hint = 'IDEMPOTENCY_KEY_REQUIRED';
  end if;

  -- One key, one order. A second call with the same key waits here for the
  -- first to finish, then finds its order.
  perform pg_advisory_xact_lock(hashtextextended(business::text || ':' || p_idempotency_key::text, 0));

  select o.id into new_order
    from public.orders as o
   where o.bakery_id = business and o.idempotency_key = p_idempotency_key;
  if found then
    return query select new_order, false;
    return;
  end if;

  -- The totals must be the sum of their parts: the server priced them, and
  -- this keeps anything else from storing an order that does not add up. A
  -- missing figure makes the test unknown, which is refused too.
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

  -- The oversell guard. The products are locked, in one order so two orders
  -- cannot deadlock, and only then is stock read: a second order for the same
  -- product waits, then sees what the first reserved.
  perform 1
     from public.products as p
    where p.bakery_id = business
      and p.id in (select (line ->> 'product_id')::uuid from jsonb_array_elements(lines) as line where line ->> 'product_id' is not null)
    order by p.id
      for no key update;

  select jsonb_agg(jsonb_build_object(
           'productId', s.product_id, 'name', s.product_name, 'available', s.available, 'requested', s.requested))
    into shortfalls
    from public.stock_shortfalls(lines) as s;
  if shortfalls is not null then
    raise exception 'not enough stock' using
      errcode = 'P0001',
      hint = 'ORDER_INSUFFICIENT_STOCK',
      detail = jsonb_build_object('shortfalls', shortfalls)::text;
  end if;

  -- The number is left to assign_order_number.
  insert into public.orders (
    bakery_id, customer_id, status, payment_status, payment_method, payment_reference,
    subtotal, discount, delivery_charge, tax, total,
    delivery_type, delivery_date, delivery_address, delivery_google_maps_link, notes, idempotency_key
  )
  values (
    business,
    (p_order ->> 'customer_id')::uuid,
    'PENDING',
    -- An order that comes to nothing owes nothing; otherwise the payments decide.
    case when order_total = 0 then 'PAID' else 'UNPAID' end,
    payment ->> 'method',
    nullif(payment ->> 'reference', ''),
    (p_order ->> 'subtotal')::integer,
    (p_order ->> 'discount')::integer,
    (p_order ->> 'delivery_charge')::integer,
    (p_order ->> 'tax')::integer,
    order_total,
    p_order ->> 'delivery_type',
    (p_order ->> 'delivery_date')::timestamptz,
    nullif(p_order ->> 'delivery_address', ''),
    nullif(p_order ->> 'delivery_google_maps_link', ''),
    nullif(p_order ->> 'notes', ''),
    p_idempotency_key
  )
  returning id into new_order;

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, subtotal, notes)
  select new_order,
         (line ->> 'product_id')::uuid,
         line ->> 'product_name',
         (line ->> 'unit_price')::integer,
         (line ->> 'quantity')::integer,
         (line ->> 'subtotal')::integer,
         nullif(line ->> 'notes', '')
    from jsonb_array_elements(lines) with ordinality as entry(line, position)
   order by position;

  insert into public.order_adjustments (order_id, type, name, amount)
  select new_order, a ->> 'type', a ->> 'name', (a ->> 'amount')::integer
    from jsonb_array_elements(adjustments) with ordinality as entry(a, position)
   order by position;

  -- Stock is reserved for catalogue lines; a custom line moves none (§139.11.7).
  insert into public.inventory_transactions (bakery_id, product_id, type, quantity, reference_type, reference_id)
  select business, (line ->> 'product_id')::uuid, 'ORDER_RESERVATION', -(line ->> 'quantity')::integer, 'ORDER', new_order::text
    from jsonb_array_elements(lines) as line
   where line ->> 'product_id' is not null;

  -- Paid in full or part paid: the payment is recorded with the order, and the
  -- payment status follows from it (sync_order_payment_status).
  if payment is not null then
    insert into public.payments (bakery_id, order_id, amount, payment_method, reference)
    values (business, new_order, (payment ->> 'amount')::integer, payment ->> 'method', nullif(payment ->> 'reference', ''));
  end if;

  return query select new_order, true;
end;
$$;

revoke all on function public.stock_shortfalls(jsonb) from public, anon;
revoke all on function public.create_order(jsonb, uuid) from public, anon;
grant execute on function public.stock_shortfalls(jsonb) to authenticated;
grant execute on function public.create_order(jsonb, uuid) to authenticated;
