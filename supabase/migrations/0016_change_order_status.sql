-- ============================================================
-- Moving an order along is one transaction (plan §139.12 `…_order_rpc`,
-- §139.11.8; tracker R3.4).
--
-- The move, the stock that follows it, and the notification it sends were
-- three writes. On 2026-09-23 a failure at the last step left the status
-- changed and the stock consumed, and the retry, seeing the order already
-- delivered, never sent the notification (§133.3 C6). Now:
--
-- 1. `order_status_next` is the transition table (§139.11.8), the same as
--    ORDER_STATUS_TRANSITIONS in src/constants/statuses.ts; a test keeps the
--    two equal.
-- 2. `change_order_status(order, from, to)` locks the order, refuses a move
--    from anywhere but `from` (someone else moved it) or one the table does
--    not allow, moves it, posts the stock that follows, and queues the
--    notification — all or nothing. `security invoker`, so row-level
--    security applies.
--
-- The notification is queued as what happened, not as words: the worker
-- writes it from messages.ts when it sends it (BUG-26), so a stored status
-- never reaches a person as "IN_PROGRESS".
-- ============================================================

create or replace function public.order_status_next(p_status text, p_delivery_type text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'PENDING'     then array['IN_PROGRESS', 'CANCELLED']
    when 'IN_PROGRESS' then case when p_delivery_type = 'DELIVERY'
                                 then array['READY', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']
                                 else array['READY', 'DELIVERED', 'CANCELLED'] end
    when 'READY'       then case when p_delivery_type = 'DELIVERY'
                                 then array['IN_TRANSIT', 'DELIVERED', 'CANCELLED']
                                 else array['DELIVERED', 'CANCELLED'] end
    when 'IN_TRANSIT'  then array['DELIVERED', 'CANCELLED']
    else array[]::text[]
  end;
$$;

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

  -- Queued in the same transaction, so a move is never without its
  -- notification, nor a notification without its move (JOB_TYPES.pushNotification).
  insert into public.jobs (type, payload)
  values (
    'SEND_PUSH_NOTIFICATION',
    jsonb_build_object(
      'bakeryId', business,
      'message', jsonb_build_object(
        'kind', 'ORDER_STATUS',
        'orderId', p_order_id,
        'orderNumber', moved.order_number,
        'status', p_to,
        'deliveryType', moved.delivery_type
      )
    )
  );

  return next moved;
end;
$$;

revoke all on function public.order_status_next(text, text) from public, anon;
revoke all on function public.change_order_status(uuid, text, text) from public, anon;
grant execute on function public.order_status_next(text, text) to authenticated;
grant execute on function public.change_order_status(uuid, text, text) to authenticated;
