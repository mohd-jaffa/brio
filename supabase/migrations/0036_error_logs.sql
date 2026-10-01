-- ============================================================
-- The error log, and seven days for every log (plan §103, §104, §37,
-- §139.11.21; the user, 2026-09-30: "like audit logs, let there be proper
-- error logs too. and only dev can see it, also both error logs and audit
-- logs will be cleared in 7 days").
--
-- 1. `error_logs`: what failed on the server — a request that could not be
--    served, a screen that could not be drawn, work that did not finish —
--    with the reference the person was shown, where it happened, who was
--    asking, and the thrown value's own message and stack. Written by the
--    server only, through the service role (src/lib/audit/errorLog.ts), and
--    read by the developer console only (`withDevRoute`). No owner can read
--    it, and nobody signed in can write it.
-- 2. `clean_up_logs()`: drops audit and error rows older than seven days —
--    LOG_KEEP_DAYS in src/constants/logs.ts, which a test keeps equal. The
--    database's scheduler runs it every hour, worker or not, so nothing is
--    kept much past its seven days.
-- ============================================================

-- ------------------------------------------------------------
-- 1. The error log
-- ------------------------------------------------------------

create table public.error_logs (
  id uuid primary key default gen_random_uuid(),
  -- Where it happened: a request, a screen, the server's own work, a job.
  source text not null check (source in ('API', 'SCREEN', 'SERVER', 'WORKER')),
  -- What failed, in words: the line the server's output carries.
  message text not null,
  -- What the person was shown to quote: a request's id, or a screen's digest.
  reference text,
  -- The catalogue code and the kind of failure (src/lib/errors), for a request.
  code text,
  kind text,
  http_status integer,
  method text,
  path text,
  -- Who was asking, when it is known. A deleted account takes its business's
  -- rows with it, as it takes its audit trail.
  user_id uuid references public.profiles(id) on delete set null,
  bakery_id uuid references public.bakeries(id) on delete cascade,
  -- The thrown value's own message and stack: the driver's text, which may
  -- name tables and values, so no owner ever reads it (AGENTS.md §10).
  detail text,
  stack text,
  -- Anything else that helps, redacted as the logger redacts it.
  context jsonb,
  created_at timestamptz not null default now()
);

create index idx_error_logs_created_at on public.error_logs (created_at);
create index idx_error_logs_reference on public.error_logs (reference);
create index idx_error_logs_bakery_id on public.error_logs (bakery_id);
create index idx_error_logs_user_id on public.error_logs (user_id);

-- No policy at all: a signed-in owner reads nothing and writes nothing. Only
-- the server's own client, which RLS does not bind, reaches it.
alter table public.error_logs enable row level security;

revoke all on public.error_logs from public, anon, authenticated;
grant select, insert, delete on public.error_logs to service_role;

-- ------------------------------------------------------------
-- 2. Seven days, for every log
-- ------------------------------------------------------------

create or replace function public.clean_up_logs()
returns integer
language sql
set search_path = ''
as $$
  with audit as (
    delete from public.audit_logs where created_at < now() - interval '7 days' returning 1
  ), errors as (
    delete from public.error_logs where created_at < now() - interval '7 days' returning 1
  )
  select ((select count(*) from audit) + (select count(*) from errors))::integer;
$$;

revoke all on function public.clean_up_logs() from public, anon, authenticated;
grant execute on function public.clean_up_logs() to service_role;

-- Every hour, so a row is gone within the hour after its seventh day.
select cron.schedule('log-cleanup', '23 * * * *', $$select public.clean_up_logs()$$);
