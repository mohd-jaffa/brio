-- ============================================================
-- A developer's account has no business (the user, 2026-09-27; plan §5,
-- §37).
--
-- DEV reads the platform — the accounts, the audit trail, the job queue — in
-- the developer console, and never a business's own data (AGENTS.md §8). It
-- owns no business, so its profile names none. Every owner still does: the
-- check keeps `bakery_id` required for everyone but a developer.
--
-- Nothing else changes. With no business, `current_profile_bakery_id()`
-- answers null for a developer, so no business row is theirs under RLS.
-- A developer's account is never made by registering: it is added from the
-- Supabase dashboard, with its profile set to DEV and no business.
-- ============================================================

alter table public.profiles alter column bakery_id drop not null;

alter table public.profiles
  add constraint profiles_owner_has_business check (role = 'DEV' or bakery_id is not null);
