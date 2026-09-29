-- ============================================================
-- Push to the installed web app, with no worker (R8.6; the user, 2026-09-29:
-- "build the pwa push with pg_cron"; plan §139.17.4).
--
-- A browser that has turned order reminders on is kept here, as the plan's
-- `device_tokens` (§139.12): its push service's address and the keys that
-- encrypt what is sent to it. Only the server reads or writes it.
--
-- Nothing in the app is awake to send at 8 AM, so the database's own
-- scheduler (pg_cron, in every Supabase plan) asks the app to look every five
-- minutes, through pg_net: `POST /api/cron/due-orders`, with a shared secret.
-- The app then takes each business's due notices as the bell does, writes
-- them to the inbox and pushes them. No Edge Function is involved.
--
-- Where to call and the secret are the environment's, not the repository's:
-- they are read from Supabase Vault, and until both are set nothing is
-- called (see .env.example, "Web push"). Nor is anything called while no
-- browser wants pushes, or while a worker runs — the worker sends them then.
-- ============================================================

-- ------------------------------------------------------------
-- 1. The browsers that want pushes
-- ------------------------------------------------------------

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Web Push only for now; the Android app sets its own reminders.
  platform text not null constraint device_tokens_platform_known check (platform in ('WEB')),
  -- The push service's address for this browser: unique to it.
  token text not null constraint device_tokens_token_unique unique
    constraint device_tokens_token_length check (char_length(token) between 1 and 1024),
  -- The browser's public key and secret, which encrypt what is sent to it.
  p256dh text not null constraint device_tokens_p256dh_length check (char_length(p256dh) between 1 and 200),
  auth text not null constraint device_tokens_auth_length check (char_length(auth) between 1 and 100),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index device_tokens_bakery_idx on public.device_tokens (bakery_id);
create index device_tokens_profile_idx on public.device_tokens (profile_id);

-- The server's alone, through the service role: no policy lets a user in.
alter table public.device_tokens enable row level security;
revoke all on public.device_tokens from anon, authenticated;

-- ------------------------------------------------------------
-- 2. The scheduler that asks the app to look
-- ------------------------------------------------------------

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Asks the app to look for orders due, and answers pg_net's request id, or
-- null when there was no call to make. The owner's rights, to read the Vault.
create or replace function public.request_due_order_sweep()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  target text;
  secret text;
begin
  if public.worker_enabled() or not exists (select 1 from public.device_tokens) then
    return null;
  end if;

  select s.decrypted_secret into target from vault.decrypted_secrets as s where s.name = 'due_order_sweep_url';
  select s.decrypted_secret into secret from vault.decrypted_secrets as s where s.name = 'due_order_sweep_secret';
  if target is null or secret is null then
    return null;
  end if;

  return net.http_post(
    url := target,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret),
    timeout_milliseconds := 10000
  );
end;
$$;

revoke all on function public.request_due_order_sweep() from public, anon, authenticated;

-- Every five minutes; the app tells nothing before the business's morning.
select cron.schedule('due-order-sweep', '*/5 * * * *', 'select public.request_due_order_sweep()');

-- The scheduler keeps a row for every run: a week of them is enough.
select cron.schedule(
  'cron-history-cleanup',
  '17 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);
