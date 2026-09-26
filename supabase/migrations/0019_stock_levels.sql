-- ============================================================
-- What is on the shelf, per product (plan §139.10, §20; tracker R5.7).
--
-- A balance is the sum of a product's ledger lines (AGENTS.md §14). Inventory
-- and Home's low stock added them up after reading every line, and a read
-- stops at the API's row limit (`max_rows`, 1,000): past that many movements
-- the sums were quietly short. `stock_levels` adds them up in the database,
-- so a reader gets one row per product however long the ledger grows.
--
-- `stocked` is the oversell guard's own test (0015): a product is stocked
-- once anything but an order's own lines has been recorded for it. A product
-- nobody counts is made to order, never "low", and never refused.
--
-- `security_invoker`, so the ledger's row-level security still decides what
-- anyone sees; read-only, and no table.
-- ============================================================

create or replace view public.stock_levels
with (security_invoker = true) as
select t.bakery_id,
       t.product_id,
       sum(t.quantity)::integer                                                   as balance,
       bool_or(t.type in ('STOCK_IN', 'ADJUSTMENT', 'WASTAGE', 'RETURN'))          as stocked,
       max(t.created_at)                                                          as last_moved_at
  from public.inventory_transactions as t
 group by t.bakery_id, t.product_id;

revoke all on public.stock_levels from public, anon;
grant select on public.stock_levels to authenticated;
