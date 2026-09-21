-- 0002_business_core.sql
-- Create Phase 2 Business Core tables

-- ==========================================
-- CUSTOMERS
-- ==========================================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  address text,
  google_maps_link text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bakery_id, phone)
);

create index if not exists customers_bakery_phone_idx on public.customers(bakery_id, phone);

create trigger set_customers_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

alter table public.customers enable row level security;

create policy customers_all_own
on public.customers
for all
to authenticated
using (bakery_id = public.current_profile_bakery_id())
with check (bakery_id = public.current_profile_bakery_id());

-- ==========================================
-- CATEGORIES
-- ==========================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete cascade,
  name text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_bakery_active_idx on public.categories(bakery_id, is_active);

create trigger set_categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

alter table public.categories enable row level security;

create policy categories_all_own
on public.categories
for all
to authenticated
using (bakery_id = public.current_profile_bakery_id())
with check (bakery_id = public.current_profile_bakery_id());

-- ==========================================
-- PRODUCTS
-- ==========================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  default_price integer not null check (default_price >= 0),
  unit text not null default 'piece',
  image text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_bakery_active_idx on public.products(bakery_id, is_active);
create index if not exists products_bakery_category_idx on public.products(bakery_id, category_id);

create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

alter table public.products enable row level security;

create policy products_all_own
on public.products
for all
to authenticated
using (bakery_id = public.current_profile_bakery_id())
with check (bakery_id = public.current_profile_bakery_id());

-- ==========================================
-- ORDERS
-- ==========================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  order_number text not null,
  
  status text not null check (status in ('PENDING', 'IN_PROGRESS', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')) default 'PENDING',
  
  payment_status text not null check (payment_status in ('UNPAID', 'PAID', 'PARTIALLY_PAID')) default 'UNPAID',
  payment_method text check (payment_method in ('CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER')),
  payment_reference text,
  
  subtotal integer not null check (subtotal >= 0),
  discount integer not null default 0 check (discount >= 0),
  delivery_charge integer not null default 0 check (delivery_charge >= 0),
  tax integer not null default 0 check (tax >= 0),
  total integer not null check (total >= 0),
  
  delivery_type text not null check (delivery_type in ('DELIVERY', 'PICKUP')) default 'DELIVERY',
  delivery_date timestamptz not null,
  delivery_address text,
  delivery_google_maps_link text,
  notes text,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bakery_id, order_number)
);

create index if not exists orders_bakery_status_date_idx on public.orders(bakery_id, status, delivery_date);
create index if not exists orders_bakery_payment_idx on public.orders(bakery_id, payment_status);
create index if not exists orders_bakery_customer_idx on public.orders(bakery_id, customer_id);

create trigger set_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

alter table public.orders enable row level security;

create policy orders_all_own
on public.orders
for all
to authenticated
using (bakery_id = public.current_profile_bakery_id())
with check (bakery_id = public.current_profile_bakery_id());

-- ==========================================
-- ORDER_ITEMS
-- ==========================================
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  
  product_name text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  subtotal integer not null check (subtotal >= 0),
  notes text,
  
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items(order_id);

alter table public.order_items enable row level security;

create policy order_items_all_own
on public.order_items
for all
to authenticated
using (order_id in (select id from public.orders where bakery_id = public.current_profile_bakery_id()))
with check (order_id in (select id from public.orders where bakery_id = public.current_profile_bakery_id()));

-- ==========================================
-- ORDER_ADJUSTMENTS
-- ==========================================
create table if not exists public.order_adjustments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  type text not null check (type in ('DISCOUNT', 'CHARGE')),
  name text not null,
  amount integer not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists order_adjustments_order_idx on public.order_adjustments(order_id);

alter table public.order_adjustments enable row level security;

create policy order_adjustments_all_own
on public.order_adjustments
for all
to authenticated
using (order_id in (select id from public.orders where bakery_id = public.current_profile_bakery_id()))
with check (order_id in (select id from public.orders where bakery_id = public.current_profile_bakery_id()));

-- ==========================================
-- INVENTORY_TRANSACTIONS
-- ==========================================
create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  
  type text not null check (type in ('STOCK_IN', 'ORDER_RESERVATION', 'ORDER_CONSUMPTION', 'ADJUSTMENT', 'WASTAGE', 'RETURN')),
  quantity integer not null,
  
  reference_type text,
  reference_id text,
  
  created_at timestamptz not null default now()
);

create index if not exists inv_tx_bakery_product_time_idx on public.inventory_transactions(bakery_id, product_id, created_at);

alter table public.inventory_transactions enable row level security;

create policy inventory_tx_all_own
on public.inventory_transactions
for all
to authenticated
using (bakery_id = public.current_profile_bakery_id())
with check (bakery_id = public.current_profile_bakery_id());

-- ==========================================
-- EXPENSES
-- ==========================================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete cascade,
  category text not null check (category in ('Ingredients', 'Packaging', 'Delivery', 'Equipment', 'Utilities', 'Marketing', 'Rent', 'Other')),
  description text not null,
  amount integer not null check (amount > 0),
  expense_date date not null,
  payment_method text not null check (payment_method in ('CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER')),
  receipt_url text,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_bakery_date_idx on public.expenses(bakery_id, expense_date);
create index if not exists expenses_bakery_category_idx on public.expenses(bakery_id, category);

create trigger set_expenses_updated_at
before update on public.expenses
for each row
execute function public.set_updated_at();

alter table public.expenses enable row level security;

create policy expenses_all_own
on public.expenses
for all
to authenticated
using (bakery_id = public.current_profile_bakery_id())
with check (bakery_id = public.current_profile_bakery_id());
