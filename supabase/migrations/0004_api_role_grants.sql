-- ============================================================
-- Privileges for the API roles.
--
-- RLS decides which rows a role may see. It does not decide whether the role
-- may touch the table at all — that is a GRANT, and without one PostgreSQL
-- refuses the statement before any policy is consulted. Every policy in
-- 0002 and 0003 was therefore unreachable: a signed-in baker reading their own
-- customers got "permission denied for table customers".
--
-- anon deliberately receives nothing. It is the key the browser holds before
-- anyone signs in, and there is no public data in this product.
-- ============================================================

grant usage on schema public to authenticated, service_role;

-- ------------------------------------------------------------
-- A signed-in baker. RLS narrows every one of these to their own bakery
-- (AGENTS.md §7); the grant only opens the door.
-- ------------------------------------------------------------
grant select, insert, update, delete on
  public.customers,
  public.categories,
  public.products,
  public.orders,
  public.order_items,
  public.order_adjustments,
  public.inventory_transactions,
  public.expenses,
  public.payments,
  public.notifications
to authenticated;

-- Audit rows are written and read, never edited or deleted (AGENTS.md §11).
grant select, insert on public.audit_logs to authenticated;

-- A profile and a bakery are read by the account they describe and changed by
-- the server, so a baker gets SELECT and nothing more.
grant select on public.profiles, public.bakeries to authenticated;

-- ------------------------------------------------------------
-- The job queue (AGENTS.md §17). Work is enqueued on a baker's behalf while
-- serving their request, so the insert arrives as `authenticated` — but a job
-- row carries no bakery_id, so nobody but the worker may read one back.
-- ------------------------------------------------------------
grant insert on public.jobs to authenticated;

drop policy if exists jobs_insert_authenticated on public.jobs;
create policy jobs_insert_authenticated
on public.jobs
for insert
to authenticated
with check (true);

-- ------------------------------------------------------------
-- The service role bypasses RLS. It is what registration, the session lookup
-- and the workers run as.
-- ------------------------------------------------------------
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- Anything added later starts the same way, rather than silently losing
-- access the way these tables did.
alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;

revoke all on all tables in schema public from anon;
