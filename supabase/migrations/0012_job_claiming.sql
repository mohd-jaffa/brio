-- ============================================================
-- The job queue can be run (plan §26, §133.6 F3–F5, tracker R2.1).
--
-- 1. A job's status is one of four.
-- 2. `claim_next_job` takes one due job atomically: FOR UPDATE SKIP LOCKED,
--    so two workers never take the same job and neither waits on the other,
--    and the attempt is counted as it is taken (F3, F4).
-- 3. `recover_stale_jobs` hands back a job whose worker stopped responding —
--    or sets it aside as failed once it has used its attempts — so nothing is
--    left `processing` for good (F5).
--
-- Only the worker, as the service role, may call either.
-- ============================================================

alter table public.jobs
  add constraint jobs_status_check check (status in ('pending', 'processing', 'completed', 'failed'));

create index if not exists jobs_due_idx on public.jobs (run_at, created_at) where status = 'pending';
create index if not exists jobs_held_idx on public.jobs (locked_at) where status = 'processing';

create or replace function public.claim_next_job(p_worker text)
returns setof public.jobs
language sql
set search_path = ''
as $$
  update public.jobs as j
     set status = 'processing',
         locked_at = now(),
         locked_by = p_worker,
         attempts = j.attempts + 1
   where j.id = (
     select id
       from public.jobs
      where status = 'pending'
        and run_at <= now()
      order by run_at, created_at
      limit 1
      for update skip locked
   )
  returning j.*;
$$;

create or replace function public.recover_stale_jobs(p_lease interval, p_max_attempts integer)
returns integer
language sql
set search_path = ''
as $$
  with recovered as (
    update public.jobs
       set status = case when attempts >= p_max_attempts then 'failed' else 'pending' end,
           last_error = 'The worker running it stopped responding.',
           locked_at = null,
           locked_by = null,
           run_at = now()
     where status = 'processing'
       and locked_at < now() - p_lease
    returning 1
  )
  select count(*)::integer from recovered;
$$;

revoke all on function public.claim_next_job(text) from public, anon, authenticated;
revoke all on function public.recover_stale_jobs(interval, integer) from public, anon, authenticated;
grant execute on function public.claim_next_job(text) to service_role;
grant execute on function public.recover_stale_jobs(interval, integer) to service_role;
