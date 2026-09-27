-- ============================================================
-- A profile picture for every account (the user, 2026-09-27).
--
-- The owner's picture is one of nine animals that ship with the app
-- (src/assets/avatars), in place of their initials. It is never an upload
-- (AGENTS.md §16): only its key is kept, and only these keys are taken. A new
-- account is given one at random, whatever path makes it, and every account
-- there is now is given one the same way. The owner changes it from Settings,
-- as often as they like, through the server: `profiles` is written by the
-- service role only (0008), and the 30-day rule (0021) is not about it.
--
-- The keys are AVATAR_KEYS in src/constants/avatars.ts. A key is never
-- renamed or reused; adding one changes `avatar_keys()` here.
-- ============================================================

create or replace function public.avatar_keys()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['pomeranian', 'hamster', 'blue-bear', 'husky', 'polar-bear', 'cream-kitten', 'ginger-cat', 'beagle', 'tiger']
$$;

-- One of the keys, each as likely as the next.
create or replace function public.random_avatar()
returns text
language sql
volatile
set search_path = ''
as $$
  select keys[1 + floor(random() * cardinality(keys))::int]
  from (select public.avatar_keys() as keys) as avatars
$$;

revoke all on function public.avatar_keys() from public, anon, authenticated;
revoke all on function public.random_avatar() from public, anon, authenticated;

-- A volatile default is worked out for each row as the column is added, so
-- every account there is now draws its own.
alter table public.profiles
  add column avatar text not null default public.random_avatar()
    constraint profiles_avatar_known check (avatar = any (public.avatar_keys()));
