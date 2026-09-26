-- ============================================================
-- What each customer still owes, for the Customers list (the user,
-- 2026-09-27; plan §139.10).
--
-- Customers gains a **Balance due** tab beside All, Regular and New: the
-- customers who owe the business money, the most owed first. It pages and
-- searches on the server like the others (§133.9 I4), so `customer_stats`
-- (0017) now also adds up each customer's balance: for every order not
-- cancelled, its total less what has been paid on it, never below nothing —
-- the same sum a customer's own screen makes (`summarise`,
-- src/features/customers/summary.ts).
--
-- Still `security_invoker`, read-only, and no table: each table's row-level
-- security decides what anyone sees (AGENTS.md §7).
-- ============================================================

create or replace view public.customer_stats
with (security_invoker = true) as
select c.*,
       count(o.id) filter (where o.status <> 'CANCELLED')        as order_count,
       max(o.created_at) filter (where o.status <> 'CANCELLED')  as last_order_at,
       coalesce(
         sum(greatest(o.total - coalesce(paid.amount, 0), 0)) filter (where o.status <> 'CANCELLED'),
         0
       )::bigint                                                 as balance_due
  from public.customers as c
  left join public.orders as o
    on o.bakery_id = c.bakery_id and o.customer_id = c.id
  left join lateral (
    select sum(p.amount) as amount
      from public.payments as p
     where p.bakery_id = o.bakery_id and p.order_id = o.id
  ) as paid on true
 group by c.id;

revoke all on public.customer_stats from public, anon;
grant select on public.customer_stats to authenticated;
