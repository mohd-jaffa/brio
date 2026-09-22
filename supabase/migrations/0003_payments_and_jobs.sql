-- Stage 1 & 2: Payments, Jobs, and Audit Logs

-- ==========================================
-- 1. PAYMENTS TABLE
-- ==========================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  amount integer not null, -- stored in paise
  payment_method text not null, -- e.g., CASH, UPI, CARD, BANK_TRANSFER
  reference text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- RLS
alter table public.payments enable row level security;

create policy "Users can view their bakery payments"
  on public.payments for select
  using (
    bakery_id in (
      select bakery_id from public.profiles
      where profiles.id = auth.uid()
    )
  );

create policy "Users can insert payments for their bakery"
  on public.payments for insert
  with check (
    bakery_id in (
      select bakery_id from public.profiles
      where profiles.id = auth.uid()
    )
  );

create policy "Users can update payments for their bakery"
  on public.payments for update
  using (
    bakery_id in (
      select bakery_id from public.profiles
      where profiles.id = auth.uid()
    )
  );

create policy "Users can delete payments for their bakery"
  on public.payments for delete
  using (
    bakery_id in (
      select bakery_id from public.profiles
      where profiles.id = auth.uid()
    )
  );

-- Indexes
create index if not exists idx_payments_bakery_id on public.payments(bakery_id);
create index if not exists idx_payments_order_id on public.payments(order_id);


-- ==========================================
-- 2. JOBS TABLE (Background Workers)
-- ==========================================
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending', -- pending, processing, completed, failed
  attempts integer not null default 0,
  run_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- RLS: Jobs should typically be accessed by service role only, but we allow dev/baker insert if needed for some queuing logic
alter table public.jobs enable row level security;

create policy "Allow service role full access to jobs"
  on public.jobs for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- We can allow inserting jobs via trigger/RPC or service role. For now, we will use service_role from Next.js server.


-- ==========================================
-- 3. AUDIT LOGS TABLE
-- ==========================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null, -- CREATE, UPDATE, DELETE
  entity_type text not null, -- customers, orders, products, etc.
  entity_id uuid not null,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.audit_logs enable row level security;

create policy "Users can view audit logs for their bakery"
  on public.audit_logs for select
  using (
    bakery_id in (
      select bakery_id from public.profiles
      where profiles.id = auth.uid()
    )
  );

create policy "Users can insert audit logs for their bakery"
  on public.audit_logs for insert
  with check (
    bakery_id in (
      select bakery_id from public.profiles
      where profiles.id = auth.uid()
    )
  );

-- No update/delete policies for audit logs (immutable)

-- Indexes
create index if not exists idx_audit_logs_bakery_id on public.audit_logs(bakery_id);
create index if not exists idx_audit_logs_entity_id on public.audit_logs(entity_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);

-- ==========================================
-- 4. NOTIFICATIONS TABLE
-- ==========================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete cascade,
  title text not null,
  body text not null,
  action_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.notifications enable row level security;

create policy "Users can view their bakery notifications"
  on public.notifications for select
  using (
    bakery_id in (
      select bakery_id from public.profiles
      where profiles.id = auth.uid()
    )
  );

create policy "Users can update their bakery notifications (e.g. read status)"
  on public.notifications for update
  using (
    bakery_id in (
      select bakery_id from public.profiles
      where profiles.id = auth.uid()
    )
  );

create policy "Users can delete their bakery notifications"
  on public.notifications for delete
  using (
    bakery_id in (
      select bakery_id from public.profiles
      where profiles.id = auth.uid()
    )
  );

-- Indexes
create index if not exists idx_notifications_bakery_id on public.notifications(bakery_id);
create index if not exists idx_notifications_is_read on public.notifications(is_read);
