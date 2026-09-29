-- ============================================================
-- The queue, hardened (plan §133.6 F6 – F8, tracker R6.1).
--
-- 1. Only the server puts work on the queue (F8). A job carries no business
--    to check, so a signed-in user who may insert one could queue anything:
--    a notice in another business's inbox, an email to someone else's
--    account. Now `authenticated` may not insert a job at all.
--    - The app queues through the service role (`createJob`).
--    - The database's triggers queue as their owner (security definer),
--      from the row the user was allowed to write, so the business is theirs.
--    - An order's move is told by a trigger on its status, not from inside
--      `change_order_status`, which runs as the user. It is redefined here
--      without the insert, and is otherwise as 0016 left it.
-- 2. The queue is cleaned (F7, the CleanupWorker). `clean_up_queue()` drops
--    completed jobs after 30 days and failed ones 90 days after they were
--    queued: the same as JOB_KEEP_* in src/constants/jobs.ts, and a test
--    keeps them equal. A worker runs it once a day (`registerCleanupWorker`).
--    While none runs, the database's scheduler does, as 0031 does for the
--    due-order sweep.
--
-- Backoff between tries (F6) is the worker's: src/lib/jobs/queue.ts.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Only the server queues
-- ------------------------------------------------------------

drop policy if exists jobs_insert_authenticated on public.jobs;
revoke insert on public.jobs from authenticated;

alter function public.notify_order_placed() security definer;
alter function public.notify_customer_added() security definer;
alter function public.notify_stock_low() security definer;

-- An order moved: told as what happened, not as words (BUG-26), in the same
-- transaction as the move, so neither is ever without the other.
create or replace function public.notify_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.jobs (type, payload)
  values (
    'SEND_PUSH_NOTIFICATION',
    jsonb_build_object(
      'bakeryId', new.bakery_id,
      'message', jsonb_build_object(
        'kind', 'ORDER_STATUS',
        'orderId', new.id,
        'orderNumber', new.order_number,
        'status', new.status,
        'deliveryType', new.delivery_type
      )
    )
  );
  return null;
end;
$$;

revoke all on function public.notify_order_status() from public, anon, authenticated;

create trigger orders_notify_status
after update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.notify_order_status();

create or replace function public.change_order_status(p_order_id uuid, p_from text, p_to text)
returns setof public.orders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  business uuid := public.current_profile_bakery_id();
  moved public.orders;
begin
  select * into moved
    from public.orders as o
   where o.bakery_id = business and o.id = p_order_id
     for no key update;

  if not found then
    raise exception 'no such order' using errcode = 'P0001', hint = 'RECORD_NOT_FOUND';
  end if;
  -- Moved already, by another tap or another device: nothing is done twice.
  if moved.status is distinct from p_from then
    raise exception 'order moved elsewhere' using errcode = 'P0001', hint = 'ORDER_STATUS_CHANGED';
  end if;
  if not (p_to = any (public.order_status_next(moved.status, moved.delivery_type))) then
    raise exception 'transition not allowed' using errcode = 'P0001', hint = 'ORDER_STATUS_TRANSITION_INVALID';
  end if;

  -- The notification follows from orders_notify_status, in this transaction.
  update public.orders as o
     set status = p_to
   where o.id = p_order_id
  returning * into moved;

  -- Stock follows the move (§139.11.8). Placing reserved each catalogue line
  -- (−q). Delivered or Completed releases the reservation (+q) and posts the
  -- consumption (−q), so the balance does not move a second time (C5);
  -- Cancelled releases it (BUG-04). A custom line never touched stock.
  if p_to in ('DELIVERED', 'CANCELLED') then
    insert into public.inventory_transactions (bakery_id, product_id, type, quantity, reference_type, reference_id)
    select business, i.product_id, 'ORDER_RESERVATION', i.quantity, 'ORDER', p_order_id::text
      from public.order_items as i
     where i.order_id = p_order_id and i.product_id is not null;
  end if;
  if p_to = 'DELIVERED' then
    insert into public.inventory_transactions (bakery_id, product_id, type, quantity, reference_type, reference_id)
    select business, i.product_id, 'ORDER_CONSUMPTION', -i.quantity, 'ORDER', p_order_id::text
      from public.order_items as i
     where i.order_id = p_order_id and i.product_id is not null;
  end if;

  return next moved;
end;
$$;

-- ------------------------------------------------------------
-- 2. The queue is cleaned
-- ------------------------------------------------------------

create or replace function public.clean_up_queue()
returns integer
language sql
set search_path = ''
as $$
  with removed as (
    delete from public.jobs
     where (status = 'completed' and completed_at < now() - interval '30 days')
        or (status = 'failed' and created_at < now() - interval '90 days')
    returning 1
  )
  select count(*)::integer from removed;
$$;

revoke all on function public.clean_up_queue() from public, anon, authenticated;
grant execute on function public.clean_up_queue() to service_role;

-- While no worker runs, the database's scheduler cleans the queue, daily.
select cron.schedule(
  'queue-cleanup',
  '41 3 * * *',
  $$select public.clean_up_queue() where not public.worker_enabled()$$
);
