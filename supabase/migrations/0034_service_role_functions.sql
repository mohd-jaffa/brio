-- ============================================================
-- The service role may run every function in `public`, now and later
-- (CI, 2026-09-30).
--
-- 0004 granted the service role every function there was, and made every
-- later table and sequence its own too, but not every later function: until
-- now Supabase's own defaults granted each new function to the API roles.
-- Newer Supabase images no longer do — a function made by `postgres` is its
-- owner's alone — so on a database made fresh, as CI's is, the service role
-- could not run a function added after 0004. Among them is `random_avatar()`,
-- the default of `profiles.avatar`, so no account could be registered; and
-- `avatar_keys()`, which checks every picture the server saves.
--
-- A database made before the change kept the old defaults, and already had
-- these grants; there, this changes nothing.
--
-- `authenticated` and `anon` gain nothing here: each migration grants them
-- exactly what they may run.
-- ============================================================

grant execute on all functions in schema public to service_role;

alter default privileges in schema public
  grant execute on functions to service_role;
