-- ============================================================
-- Tenant integrity (plan §139.12, tracker R0.11 – R0.13).
--
-- 1. No row may point into another business (BUG-19). A foreign key is
--    checked without row-level security, so `orders.customer_id` could name
--    another business's customer: RLS hid it on read, but the row was corrupt.
--    Each such reference now carries its own bakery_id and must match the
--    referenced row's — a composite key the database enforces on every write.
-- 2. The payments, audit-log and notification policies follow the rest of the
--    schema (BUG-18): `to authenticated`, and current_profile_bakery_id(),
--    which also refuses a deactivated profile.
-- 3. A payment has a positive amount and a known method, like orders and
--    expenses already do (BUG-21).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Composite references
-- ------------------------------------------------------------

-- What a composite foreign key points at: (bakery_id, id) must be unique.
-- It already is, because id is; the constraint makes it referenceable.
alter table public.customers  add constraint customers_bakery_id_id_key  unique (bakery_id, id);
alter table public.categories add constraint categories_bakery_id_id_key unique (bakery_id, id);
alter table public.products   add constraint products_bakery_id_id_key   unique (bakery_id, id);
alter table public.orders     add constraint orders_bakery_id_id_key     unique (bakery_id, id);

-- An order's customer belongs to the order's business.
alter table public.orders drop constraint orders_customer_id_fkey;
alter table public.orders
  add constraint orders_customer_same_bakery_fkey
  foreign key (bakery_id, customer_id) references public.customers (bakery_id, id)
  on delete restrict;

-- A payment's order belongs to the payment's business.
alter table public.payments drop constraint payments_order_id_fkey;
alter table public.payments
  add constraint payments_order_same_bakery_fkey
  foreign key (bakery_id, order_id) references public.orders (bakery_id, id)
  on delete cascade;

-- A stock movement's product belongs to the movement's business.
alter table public.inventory_transactions drop constraint inventory_transactions_product_id_fkey;
alter table public.inventory_transactions
  add constraint inventory_transactions_product_same_bakery_fkey
  foreign key (bakery_id, product_id) references public.products (bakery_id, id)
  on delete restrict;

-- A product's category belongs to the product's business. Deleting the
-- category clears only category_id: the product keeps its bakery_id.
alter table public.products drop constraint products_category_id_fkey;
alter table public.products
  add constraint products_category_same_bakery_fkey
  foreign key (bakery_id, category_id) references public.categories (bakery_id, id)
  on delete set null (category_id);

-- Deleting an order looks its payments up by (bakery_id, order_id). The other
-- three references are already served by indexes leading with the same pair
-- (orders_bakery_customer_idx, inv_tx_bakery_product_time_idx,
-- products_bakery_category_idx).
create index if not exists payments_bakery_order_idx on public.payments (bakery_id, order_id);

-- ------------------------------------------------------------
-- 2. The three policies that skipped the shared tenant check
-- ------------------------------------------------------------

drop policy if exists "Users can view their bakery payments" on public.payments;
drop policy if exists "Users can insert payments for their bakery" on public.payments;
drop policy if exists "Users can update payments for their bakery" on public.payments;
drop policy if exists "Users can delete payments for their bakery" on public.payments;

create policy payments_all_own
on public.payments
for all
to authenticated
using (bakery_id = public.current_profile_bakery_id())
with check (bakery_id = public.current_profile_bakery_id());

drop policy if exists "Users can view audit logs for their bakery" on public.audit_logs;
drop policy if exists "Users can insert audit logs for their bakery" on public.audit_logs;

create policy audit_logs_select_own
on public.audit_logs
for select
to authenticated
using (bakery_id = public.current_profile_bakery_id());

-- Still written with the caller's own client until the server writes audit
-- itself (R2.10, BUG-20); until then, only for their own business.
create policy audit_logs_insert_own
on public.audit_logs
for insert
to authenticated
with check (bakery_id = public.current_profile_bakery_id());

drop policy if exists "Users can view their bakery notifications" on public.notifications;
drop policy if exists "Users can update their bakery notifications (e.g. read status)" on public.notifications;
drop policy if exists "Users can delete their bakery notifications" on public.notifications;

create policy notifications_select_own
on public.notifications
for select
to authenticated
using (bakery_id = public.current_profile_bakery_id());

create policy notifications_update_own
on public.notifications
for update
to authenticated
using (bakery_id = public.current_profile_bakery_id())
with check (bakery_id = public.current_profile_bakery_id());

create policy notifications_delete_own
on public.notifications
for delete
to authenticated
using (bakery_id = public.current_profile_bakery_id());

-- ------------------------------------------------------------
-- 3. What a payment may hold
-- ------------------------------------------------------------

alter table public.payments
  add constraint payments_amount_positive check (amount > 0),
  add constraint payments_method_known
    check (payment_method in ('CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER'));
