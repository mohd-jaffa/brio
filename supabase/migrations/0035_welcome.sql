-- ============================================================
-- The welcome, once for each new account (the user, 2026-09-30; plan
-- §139.11.20).
--
-- `profiles.welcomed_at` is when the owner finished or skipped the few
-- slides that open a new account. While it is empty the app shows them,
-- whichever way the owner first comes in and on whichever device; once it is
-- set, never again.
--
-- Every account there is now has used the app already, and is not new: each
-- is taken as welcomed at the moment this runs. A default fills the rows
-- there are as the column is added, without touching their `updated_at` or
-- their triggers, and is then dropped, so a new account starts without one.
--
-- `profiles` is written by the server only (0008): the service role sets it.
-- ============================================================

alter table public.profiles add column welcomed_at timestamptz default now();

alter table public.profiles alter column welcomed_at drop default;
