-- ============================================================
-- An order about to be due, and one overdue (plan §25 — "Order #1024 is due
-- tomorrow"; the user, 2026-09-26; tracker R5.10).
--
-- Due is counted in days, as everywhere in the app (IMP-05, §134 P2-2): an
-- order due today stays due today until the day ends, and only an earlier day
-- is overdue. The worker sweeps the open orders every minute
-- (`queue_due_order_notifications`), and each order is told about once:
--
-- - **Due soon** — its day is today or tomorrow, in its business's timezone;
-- - **Overdue** — its day has passed and it is still open.
--
-- Neither is sent before the hour the worker names (the business's morning),
-- so no one is woken by one at midnight. Each order keeps when it was told,
-- and the sweep marks and queues in one statement: two workers sweeping at
-- once tell it once.
-- ============================================================

alter table public.orders
  add column due_notified_at timestamptz,
  add column overdue_notified_at timestamptz;

-- Orders left open long past their day when this arrives are taken as known:
-- the owner is told of yesterday's, not of everything before it at once.
update public.orders as o
   set overdue_notified_at = now()
  from public.bakeries as b
 where b.id = o.bakery_id
   and o.status in ('PENDING', 'IN_PROGRESS', 'READY', 'IN_TRANSIT')
   and (o.delivery_date at time zone b.timezone)::date < (now() at time zone b.timezone)::date - 1;

-- The sweep reads open orders by their day, across every business.
create index orders_open_due_idx
  on public.orders (delivery_date)
  where status in ('PENDING', 'IN_PROGRESS', 'READY', 'IN_TRANSIT');

-- Marks and queues what is due soon and what is overdue; returns how many it
-- queued. Run by the worker, as the service role.
create or replace function public.queue_due_order_notifications(p_from_hour integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  soon integer;
  late integer;
begin
  with due as (
    update public.orders as o
       set due_notified_at = now()
      from public.bakeries as b
     where b.id = o.bakery_id
       and o.status in ('PENDING', 'IN_PROGRESS', 'READY', 'IN_TRANSIT')
       and o.due_notified_at is null
       and extract(hour from now() at time zone b.timezone) >= p_from_hour
       and (o.delivery_date at time zone b.timezone)::date
           between (now() at time zone b.timezone)::date and (now() at time zone b.timezone)::date + 1
    returning o.id, o.bakery_id, o.order_number, o.customer_id,
              (o.delivery_date at time zone b.timezone)::date = (now() at time zone b.timezone)::date as today
  )
  insert into public.jobs (type, payload)
  select 'SEND_PUSH_NOTIFICATION',
         jsonb_build_object(
           'bakeryId', d.bakery_id,
           'message', jsonb_build_object(
             'kind', 'ORDER_DUE',
             'orderId', d.id,
             'orderNumber', d.order_number,
             'customerName', (select c.name from public.customers as c where c.id = d.customer_id),
             'day', case when d.today then 'TODAY' else 'TOMORROW' end
           )
         )
    from due as d;
  get diagnostics soon = row_count;

  with overdue as (
    update public.orders as o
       set overdue_notified_at = now()
      from public.bakeries as b
     where b.id = o.bakery_id
       and o.status in ('PENDING', 'IN_PROGRESS', 'READY', 'IN_TRANSIT')
       and o.overdue_notified_at is null
       and extract(hour from now() at time zone b.timezone) >= p_from_hour
       and (o.delivery_date at time zone b.timezone)::date < (now() at time zone b.timezone)::date
    returning o.id, o.bakery_id, o.order_number, o.customer_id, (o.delivery_date at time zone b.timezone)::date as due_day
  )
  insert into public.jobs (type, payload)
  select 'SEND_PUSH_NOTIFICATION',
         jsonb_build_object(
           'bakeryId', l.bakery_id,
           'message', jsonb_build_object(
             'kind', 'ORDER_OVERDUE',
             'orderId', l.id,
             'orderNumber', l.order_number,
             'customerName', (select c.name from public.customers as c where c.id = l.customer_id),
             'dueDate', to_char(l.due_day, 'YYYY-MM-DD')
           )
         )
    from overdue as l;
  get diagnostics late = row_count;

  return soon + late;
end;
$$;

revoke all on function public.queue_due_order_notifications(integer) from public, anon, authenticated;
grant execute on function public.queue_due_order_notifications(integer) to service_role;
