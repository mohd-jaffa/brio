-- ============================================================
-- Lists that search and count on the server (plan §139.10, §133.9 I4;
-- tracker R5.2, R5.3).
--
-- 1. `order_search`: each order beside its customer's name and phone, so one
--    request can find an order by its number, by who it is for, or by the
--    digits of their phone (BUG-23). PostgREST cannot `or` across an
--    embedded table, and fetching the matching customers first would put an
--    unbounded list of ids in the URL. A Guest order has neither.
-- 2. `customer_stats`: each customer with how many orders they have placed
--    and when they last ordered, cancelled orders not counted, so Customers
--    can page and keep to Regular (three or more orders) on the server.
--
-- Both are `security_invoker`: they read as the caller, so each table's
-- row-level security still decides what anyone sees (AGENTS.md §7). They
-- are read-only, and add no table.
-- ============================================================

create or replace view public.order_search
with (security_invoker = true) as
select o.*,
       c.name  as customer_name,
       c.phone as customer_phone
  from public.orders as o
  left join public.customers as c
    on c.bakery_id = o.bakery_id and c.id = o.customer_id;

create or replace view public.customer_stats
with (security_invoker = true) as
select c.*,
       count(o.id) filter (where o.status <> 'CANCELLED')        as order_count,
       max(o.created_at) filter (where o.status <> 'CANCELLED')  as last_order_at
  from public.customers as c
  left join public.orders as o
    on o.bakery_id = c.bakery_id and o.customer_id = c.id
 group by c.id;

revoke all on public.order_search, public.customer_stats from public, anon;
grant select on public.order_search, public.customer_stats to authenticated;
