-- ============================================================
-- Profile details change once in 30 days, and a new email waits for its
-- confirmation (the user, 2026-09-26; tracker R5.17).
--
-- The owner's name, sign-in number and email, and the business's name, each
-- change at most once in 30 days from that field's last change. A new account
-- makes its first change whenever it likes: registering is not a change. A
-- trigger holds the rule on the row itself, so neither the API, nor
-- `update_business_profile`, nor the service role can go round it, and it
-- keeps the dates honest: they are stamped here, never taken from a caller.
-- The screens say beforehand when a field opens again.
--
-- A new email takes effect only once it is confirmed. It waits in
-- `pending_email` while the same confirmation email as at registration goes
-- to it, and replaces `email` when its link is followed. Only a hash of the
-- link's token is kept, and it lapses.
-- ============================================================

-- How long a changed detail stays as it is (PROFILE_CHANGE_DAYS in src/constants/limits.ts).
create or replace function public.profile_change_interval()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '30 days'
$$;

alter table public.profiles
  add column name_changed_at timestamptz,
  add column phone_changed_at timestamptz,
  add column email_changed_at timestamptz,
  add column pending_email citext,
  add column pending_email_token_hash text,
  add column pending_email_expires_at timestamptz;

-- A link is looked up by its token's hash.
create unique index profiles_pending_email_token_hash_unique
  on public.profiles (pending_email_token_hash)
  where pending_email_token_hash is not null;

alter table public.bakeries
  add column name_changed_at timestamptz;

-- When a field last changed, if it is changing now: refused inside the
-- interval, stamped now otherwise.
create or replace function public.stamp_profile_change(p_last timestamptz)
returns timestamptz
language plpgsql
set search_path = ''
as $$
begin
  if p_last is not null and p_last > now() - public.profile_change_interval() then
    raise exception 'changed too recently' using errcode = 'P0001', hint = 'PROFILE_CHANGE_TOO_SOON';
  end if;
  return now();
end;
$$;

revoke all on function public.stamp_profile_change(timestamptz) from public, anon, authenticated;

create or replace function public.profiles_change_once_a_month()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name_changed_at := case
    when new.name is distinct from old.name then public.stamp_profile_change(old.name_changed_at)
    else old.name_changed_at
  end;
  new.phone_changed_at := case
    when new.phone is distinct from old.phone then public.stamp_profile_change(old.phone_changed_at)
    else old.phone_changed_at
  end;
  new.email_changed_at := case
    when new.email is distinct from old.email then public.stamp_profile_change(old.email_changed_at)
    else old.email_changed_at
  end;
  return new;
end;
$$;

revoke all on function public.profiles_change_once_a_month() from public, anon, authenticated;

create trigger profiles_change_once_a_month
before update of name, phone, email, name_changed_at, phone_changed_at, email_changed_at
on public.profiles
for each row
execute function public.profiles_change_once_a_month();

create or replace function public.bakeries_name_once_a_month()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name_changed_at := case
    when new.business_name is distinct from old.business_name then public.stamp_profile_change(old.name_changed_at)
    else old.name_changed_at
  end;
  return new;
end;
$$;

revoke all on function public.bakeries_name_once_a_month() from public, anon, authenticated;

create trigger bakeries_name_once_a_month
before update of business_name, name_changed_at
on public.bakeries
for each row
execute function public.bakeries_name_once_a_month();
