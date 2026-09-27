-- ============================================================
-- No worker for now: the app sends mail and tells of due orders itself (the
-- user, 2026-09-27: "iam not able to host workers now … notifications now
-- show for only about to due or already due orders … dont remove those code
-- completely as in future i may switch to workers").
--
-- 1. `worker_enabled()` says whether a worker runs beside the app. It is
--    false, as WORKER_ENABLED is in src/constants/jobs.ts; a test keeps the
--    two equal. Running a worker again is a migration that makes it true.
-- 2. While it is false, a notification queued for the worker is not taken:
--    nothing would ever run it, and it would only pile up. That covers every
--    event that queues one — an order placed (0022), moved (0016), a
--    customer added and stock running low (0022), a payment (the app), and
--    the worker's own sweep for due orders (0023). None of them is changed.
--    Other work — a queued email — is still taken.
-- 3. The app tells of orders due soon and overdue itself, a business at a
--    time, as its owner's bell is read: `take_due_order_notices` marks what
--    is due as 0023's sweep does and hands back the facts, and the app writes
--    each notification in the app's own words (BUG-26).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Whether a worker runs
-- ------------------------------------------------------------

create or replace function public.worker_enabled()
returns boolean
language sql
immutable
set search_path = ''
as $$
  select false
$$;

-- ------------------------------------------------------------
-- 2. A notification queued for no worker is not taken
-- ------------------------------------------------------------

create or replace function public.jobs_hold_notifications()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.type = 'SEND_PUSH_NOTIFICATION' and not public.worker_enabled() then
    return null;
  end if;
  return new;
end;
$$;

revoke all on function public.jobs_hold_notifications() from public, anon, authenticated;

create trigger jobs_hold_notifications
before insert on public.jobs
for each row
execute function public.jobs_hold_notifications();

-- ------------------------------------------------------------
-- 3. Due soon and overdue, told by the app
-- ------------------------------------------------------------

-- Orders left open long past their day are taken as known, as 0023 did: no
-- sweep has run, and the first look must not tell of all of them at once.
update public.orders as o
   set overdue_notified_at = now()
  from public.bakeries as b
 where b.id = o.bakery_id
   and o.status in ('PENDING', 'IN_PROGRESS', 'READY', 'IN_TRANSIT')
   and o.overdue_notified_at is null
   and (o.delivery_date at time zone b.timezone)::date < (now() at time zone b.timezone)::date - 1;

-- One business's orders due today or tomorrow, and overdue, not yet told of:
-- each is marked as told and handed back, in one statement a kind, so two
-- looks at once tell it once. Nothing before the business's morning
-- (`p_from_hour`). Run by the server, as the service role, for the business
-- of the signed-in owner.
create or replace function public.take_due_order_notices(p_bakery_id uuid, p_from_hour integer)
returns table (kind text, order_id uuid, order_number text, customer_name text, due_day text, due_date text)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
begin
  return query
  with due as (
    update public.orders as o
       set due_notified_at = now()
      from public.bakeries as b
     where b.id = o.bakery_id
       and o.bakery_id = p_bakery_id
       and o.status in ('PENDING', 'IN_PROGRESS', 'READY', 'IN_TRANSIT')
       and o.due_notified_at is null
       and extract(hour from now() at time zone b.timezone) >= p_from_hour
       and (o.delivery_date at time zone b.timezone)::date
           between (now() at time zone b.timezone)::date and (now() at time zone b.timezone)::date + 1
    returning o.id, o.order_number, o.customer_id,
              (o.delivery_date at time zone b.timezone)::date = (now() at time zone b.timezone)::date as today
  )
  select 'ORDER_DUE'::text, d.id, d.order_number::text,
         (select c.name::text from public.customers as c where c.id = d.customer_id),
         case when d.today then 'TODAY' else 'TOMORROW' end,
         null::text
    from due as d;

  return query
  with overdue as (
    update public.orders as o
       set overdue_notified_at = now()
      from public.bakeries as b
     where b.id = o.bakery_id
       and o.bakery_id = p_bakery_id
       and o.status in ('PENDING', 'IN_PROGRESS', 'READY', 'IN_TRANSIT')
       and o.overdue_notified_at is null
       and extract(hour from now() at time zone b.timezone) >= p_from_hour
       and (o.delivery_date at time zone b.timezone)::date < (now() at time zone b.timezone)::date
    returning o.id, o.order_number, o.customer_id, (o.delivery_date at time zone b.timezone)::date as day
  )
  select 'ORDER_OVERDUE'::text, l.id, l.order_number::text,
         (select c.name::text from public.customers as c where c.id = l.customer_id),
         null::text,
         to_char(l.day, 'YYYY-MM-DD')
    from overdue as l;
end;
$$;

revoke all on function public.take_due_order_notices(uuid, integer) from public, anon, authenticated;
grant execute on function public.take_due_order_notices(uuid, integer) to service_role;
