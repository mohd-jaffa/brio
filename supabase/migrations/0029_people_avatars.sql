-- ============================================================
-- 24 more profile pictures: people (the user, 2026-09-28).
--
-- The supplied sheet of 24 portraits, each on a pastel disc, is cut into
-- pictures that ship with the app (src/assets/avatars, scripts/avatars.mjs),
-- beside the nine animals of 0026. As before, only a key is kept and only
-- these keys are taken.
--
-- `avatar_keys()` takes the new keys after the nine, so a new account draws
-- from all 33 (`random_avatar()` reads it). Every account keeps the picture it
-- has: the old keys are all still here, and `profiles_avatar_known` holds.
--
-- The keys are AVATAR_KEYS in src/constants/avatars.ts, in the same order. A
-- key is never renamed or reused.
-- ============================================================

create or replace function public.avatar_keys()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'pomeranian', 'hamster', 'blue-bear', 'husky', 'polar-bear', 'cream-kitten',
    'ginger-cat', 'beagle', 'tiger', 'green-hoodie', 'wavy-hair', 'round-glasses',
    'top-bun', 'full-beard', 'sun-hat', 'curly-hair', 'flower-clip', 'headphones',
    'coffee-mug', 'green-shirt', 'purple-hoodie', 'grandpa', 'grandma', 'dungarees',
    'pigtails', 'cap', 'hoop-earrings', 'cream-hoodie', 'daydream', 'goatee',
    'bucket-hat', 'navy-hoodie', 'low-bun'
  ]
$$;

revoke all on function public.avatar_keys() from public, anon, authenticated;
