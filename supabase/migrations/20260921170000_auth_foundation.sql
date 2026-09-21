create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('BAKER', 'DEV');
  end if;
end
$$;

create table if not exists public.bakeries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete restrict,
  business_name text not null check (char_length(trim(business_name)) >= 2),
  logo text,
  phone text not null check (char_length(trim(phone)) >= 10),
  address text,
  currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null unique check (char_length(trim(phone)) >= 10),
  email citext not null unique,
  name text not null check (char_length(trim(name)) >= 2),
  role public.user_role not null default 'BAKER',
  bakery_id uuid not null references public.bakeries(id) on delete restrict,
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  email_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bakeries_owner_id_idx on public.bakeries(owner_id);
create index if not exists profiles_bakery_id_idx on public.profiles(bakery_id);
create index if not exists profiles_role_idx on public.profiles(role);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_bakeries_updated_at on public.bakeries;
create trigger set_bakeries_updated_at
before update on public.bakeries
for each row
execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.bakeries enable row level security;
alter table public.profiles enable row level security;

create or replace function public.current_profile_bakery_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select bakery_id
  from public.profiles
  where id = auth.uid()
    and is_active = true;
$$;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists bakeries_select_own on public.bakeries;
create policy bakeries_select_own
on public.bakeries
for select
to authenticated
using (id = public.current_profile_bakery_id());

revoke all on public.bakeries from anon;
revoke all on public.profiles from anon;
grant select on public.bakeries to authenticated;
grant select on public.profiles to authenticated;
