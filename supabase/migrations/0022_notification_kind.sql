-- ============================================================
-- The notifications inbox (plan §139.10, §139.12 `…_notification_kind`,
-- §133.5 E1; tracker R5.10).
--
-- The table has been there since 0003 and nothing wrote it or read it. Now:
--
-- 1. `kind` says what a notification is about — an order, a payment, stock,
--    a customer, or the system — so the inbox can show them by tab
--    (All · Orders · Customers · System).
-- 2. It is read the way the inbox reads it: a business's newest first, and
--    how many are unread for the bell.
-- 3. The worker writes it, through the service role (plan §25: event → job →
--    worker → notification). A signed-in owner may mark one read and change
--    nothing else about it.
-- 4. Three of the plan's events are queued where they happen, in the
--    transaction that makes them (§25, §28): an order placed, a customer
--    added, and a product's stock falling to the low-stock mark. A status
--    move (0016) and a payment (src/features/payments) already queue theirs.
--
-- Each is queued as what happened, not as words: the worker writes them from
-- messages.ts when it takes the job (BUG-26).
-- ============================================================

-- ------------------------------------------------------------
-- 1. What a notification is about
-- ------------------------------------------------------------

-- No row exists yet; the default only fills the column on the way in.
alter table public.notifications add column kind text not null default 'SYSTEM';
alter table public.notifications alter column kind drop default;
alter table public.notifications
  add constraint notifications_kind_known check (kind in ('ORDER', 'PAYMENT', 'STOCK', 'CUSTOMER', 'SYSTEM'));

-- ------------------------------------------------------------
-- 2. Read the way the inbox reads it
-- ------------------------------------------------------------

-- A boolean alone narrows nothing, and the business alone is a prefix of both below.
drop index if exists public.idx_notifications_is_read;
drop index if exists public.idx_notifications_bakery_id;

create index notifications_bakery_time_idx on public.notifications (bakery_id, created_at desc, id);
create index notifications_bakery_unread_idx on public.notifications (bakery_id, is_read, created_at desc);

-- ------------------------------------------------------------
-- 3. Written by the worker; marked read by the owner
-- ------------------------------------------------------------

revoke insert, update on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;

-- ------------------------------------------------------------
-- 4. The events that queue one
-- ------------------------------------------------------------

-- The low-stock mark: the same number as LOW_STOCK_THRESHOLD in
-- src/constants/inventory.ts, which Home and Inventory use; a test keeps the
-- two equal.
create or replace function public.low_stock_mark()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 5
$$;

-- An order placed: its number, and whom it is for (none for a Guest).
create or replace function public.notify_order_placed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.jobs (type, payload)
  values (
    'SEND_PUSH_NOTIFICATION',
    jsonb_build_object(
      'bakeryId', new.bakery_id,
      'message', jsonb_build_object(
        'kind', 'ORDER_PLACED',
        'orderId', new.id,
        'orderNumber', new.order_number,
        'customerName', (select c.name from public.customers as c where c.id = new.customer_id)
      )
    )
  );
  return null;
end;
$$;

-- A customer added, from the customer form or on the spot in an order.
create or replace function public.notify_customer_added()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.jobs (type, payload)
  values (
    'SEND_PUSH_NOTIFICATION',
    jsonb_build_object(
      'bakeryId', new.bakery_id,
      'message', jsonb_build_object('kind', 'CUSTOMER_ADDED', 'customerId', new.id, 'name', new.name)
    )
  );
  return null;
end;
$$;

-- A product whose stock fell to the mark or under it, in this statement: once
-- as it crosses, not again while it stays low, and again after a restock
-- lifts it over. Only a product on sale whose stock is counted (the rule of
-- 0019 and the oversell guard) — one made to order is never low.
--
-- A consumption line never counts: it follows the release of its own
-- reservation (0016), so the pair leaves the balance where it was, and a
-- delivered order of something already low must not look like a fall.
create or replace function public.notify_stock_low()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.jobs (type, payload)
  select 'SEND_PUSH_NOTIFICATION',
         jsonb_build_object(
           'bakeryId', p.bakery_id,
           'message', jsonb_build_object(
             'kind', 'STOCK_LOW',
             'productId', p.id,
             'productName', p.name,
             'balance', level.balance,
             'unit', p.unit
           )
         )
    from (
      select m.bakery_id, m.product_id, sum(m.quantity) as moved
        from moved as m
       where m.type <> 'ORDER_CONSUMPTION'
       group by m.bakery_id, m.product_id
    ) as change
    join public.products as p on p.id = change.product_id and p.bakery_id = change.bakery_id
    cross join lateral (
      select sum(t.quantity)::integer as balance,
             bool_or(t.type in ('STOCK_IN', 'ADJUSTMENT', 'WASTAGE', 'RETURN')) as stocked
        from public.inventory_transactions as t
       where t.bakery_id = change.bakery_id and t.product_id = change.product_id
    ) as level
   where change.moved < 0
     and p.is_active
     and level.stocked
     and level.balance <= public.low_stock_mark()
     and level.balance - change.moved > public.low_stock_mark();
  return null;
end;
$$;

create trigger orders_notify_placed
after insert on public.orders
for each row execute function public.notify_order_placed();

create trigger customers_notify_added
after insert on public.customers
for each row execute function public.notify_customer_added();

create trigger inventory_notify_stock_low
after insert on public.inventory_transactions
referencing new table as moved
for each statement execute function public.notify_stock_low();

-- A trigger's function is not something to call. The mark is read inside
-- one, as whoever made the change.
revoke all on function public.notify_order_placed() from public, anon, authenticated;
revoke all on function public.notify_customer_added() from public, anon, authenticated;
revoke all on function public.notify_stock_low() from public, anon, authenticated;
revoke all on function public.low_stock_mark() from public, anon;
grant execute on function public.low_stock_mark() to authenticated;
