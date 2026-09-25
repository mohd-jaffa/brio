-- ============================================================
-- Guest orders (plan §139.11.3, Q12; tracker R3.5).
--
-- A walk-in who never becomes a customer can still be sold to: an order's
-- customer may be NULL, which means Guest. The API never sends an accidental
-- null — it names the customer as { kind: "GUEST" } or { kind: "CUSTOMER", id }
-- (src/lib/validation/schemas/order.ts) — so a NULL here is always a choice.
--
-- The composite reference to the customer (0005) is MATCH SIMPLE: a NULL
-- customer_id is not checked, and any other value must still belong to the
-- order's own business.
-- ============================================================

alter table public.orders alter column customer_id drop not null;

-- Guest sales (R5.5) and the Guest filter on Orders read these by business
-- and time.
create index if not exists orders_guest_created_idx
  on public.orders (bakery_id, created_at)
  where customer_id is null;
