-- ============================================================
-- Ready (plan §139.11.8, Q3 answered; tracker R3.11).
--
-- An order can now wait, made and packed, for its pickup or its driver. No
-- other stored value changes: IN_PROGRESS reads "Preparing", and DELIVERED
-- reads "Completed" for a pickup — labels, not data (src/constants/statuses.ts).
-- ============================================================

alter table public.orders drop constraint orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('PENDING', 'IN_PROGRESS', 'READY', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'));
