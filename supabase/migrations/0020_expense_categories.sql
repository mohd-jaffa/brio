-- ============================================================
-- Expense categories: the eight defaults, the business's own, and a
-- picture for each (plan §139.11.10; the user, 2026-09-26; tracker R5.16).
--
-- Every business has the eight categories of §22, which stay exactly as they
-- are: their names are fixed, they show `default-expense`, and they are never
-- deleted. The owner may add categories of their own, each with a picture
-- picked from the library, rename them, change the picture, and delete one no
-- expense is filed under. A business sees the defaults and the categories it
-- made, never another business's.
--
-- An expense keeps its category by name, as it always has. So a rename moves
-- the category's expenses and its picture with it, in one transaction, and a
-- category with expenses cannot be deleted. `expenses.category` was checked
-- against the eight; it now takes a default or a category the expense's own
-- business made, which a trigger checks, since a CHECK cannot look at another
-- table.
--
-- The pictures of a business's own categories are kept in
-- `bakeries.expense_category_icons` (0007), a JSON object from a category's
-- name to a key; a category it does not name shows `default-expense`. `bakeries` is SELECT-only for the API
-- role (0008), so every change to a category goes through a function below
-- that acts only for the business's owner, as `update_business_profile`
-- does. A key's shape is checked here; that it is one the library has is the
-- server's check (`z.enum(ILLUSTRATION_KEYS)`), so a new illustration needs
-- no migration.
-- ============================================================

-- The eight, spelled as the app spells them (DEFAULT_EXPENSE_CATEGORIES).
create or replace function public.default_expense_categories()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['Ingredients', 'Packaging', 'Delivery', 'Equipment', 'Utilities', 'Marketing', 'Rent', 'Other']
$$;

-- Whether a name is one of the eight, as a person would read it: trimmed, any case.
create or replace function public.names_default_expense_category(p_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (
    select 1 from unnest(public.default_expense_categories()) as d(name)
     where lower(d.name) = lower(btrim(p_name))
  )
$$;

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A category is a tile's label, not a sentence (src/lib/validation).
  constraint expense_categories_name_length check (char_length(btrim(name)) between 1 and 40),
  -- The eight are already there for every business.
  constraint expense_categories_not_a_default check (not public.names_default_expense_category(name))
);

-- "Flowers", "flowers" and " Flowers" are one category within a business.
create unique index expense_categories_bakery_name_unique
  on public.expense_categories (bakery_id, lower(btrim(name)));

create trigger set_expense_categories_updated_at
before update on public.expense_categories
for each row
execute function public.set_updated_at();

alter table public.expense_categories enable row level security;

create policy expense_categories_own
on public.expense_categories
for all
to authenticated
using (bakery_id = public.current_profile_bakery_id())
with check (bakery_id = public.current_profile_bakery_id());

-- Read through RLS; every change goes through the functions below.
revoke all on public.expense_categories from public, anon, authenticated;
grant select on public.expense_categories to authenticated;

-- ------------------------------------------------------------
-- An expense's category: a default, or one its own business made. The
-- category's row is locked for share, so a rename or a delete running at the
-- same moment waits for the expense, or the expense for it.
-- ------------------------------------------------------------

alter table public.expenses drop constraint expenses_category_check;

create or replace function public.expense_category_known()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.category = any (public.default_expense_categories()) then
    return new;
  end if;
  perform 1 from public.expense_categories c
   where c.bakery_id = new.bakery_id
     and c.name = new.category
     for share;
  if found then
    return new;
  end if;
  raise exception 'unknown expense category' using errcode = 'P0001', hint = 'EXPENSE_CATEGORY_UNKNOWN';
end;
$$;

revoke all on function public.expense_category_known() from public, anon, authenticated;

create trigger expenses_category_known
before insert or update of category, bakery_id on public.expenses
for each row
execute function public.expense_category_known();

-- ------------------------------------------------------------
-- The owner's business, or a refusal; and a picture key's shape.
-- ------------------------------------------------------------

create or replace function public.owned_business_for_categories(p_icon_key text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  business uuid := public.current_profile_bakery_id();
begin
  if p_icon_key is not null and (p_icon_key !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_icon_key) > 64) then
    raise exception 'not an illustration key' using errcode = 'P0001', hint = 'VALIDATION_ERROR';
  end if;
  if not exists (select 1 from public.bakeries b where b.id = business and b.owner_id = auth.uid()) then
    raise exception 'no business for this caller' using errcode = 'P0001', hint = 'RECORD_NOT_FOUND';
  end if;
  return business;
end;
$$;

revoke all on function public.owned_business_for_categories(text) from public, anon, authenticated;

-- A category's picture set, or taken back to the default with a null key.
create or replace function public.put_expense_category_icon(p_business uuid, p_name text, p_icon_key text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.bakeries as b
     set expense_category_icons = (b.expense_category_icons - p_name)
       || case when p_icon_key is null then '{}'::jsonb else jsonb_build_object(p_name, p_icon_key) end
   where b.id = p_business;
$$;

revoke all on function public.put_expense_category_icon(uuid, text, text) from public, anon, authenticated;

-- ------------------------------------------------------------
-- Add, change and delete a category.
-- ------------------------------------------------------------

create or replace function public.create_expense_category(p_name text, p_icon_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  business uuid := public.owned_business_for_categories(p_icon_key);
  created public.expense_categories;
begin
  if public.names_default_expense_category(p_name) then
    raise exception 'a default category' using errcode = 'P0001', hint = 'EXPENSE_CATEGORY_ALREADY_EXISTS';
  end if;
  begin
    insert into public.expense_categories (bakery_id, name)
    values (business, btrim(p_name))
    returning * into created;
  exception when unique_violation then
    raise exception 'category taken' using errcode = 'P0001', hint = 'EXPENSE_CATEGORY_ALREADY_EXISTS';
  end;
  -- A key left by a category of this name deleted before is cleared, or replaced.
  perform public.put_expense_category_icon(business, created.name, p_icon_key);
  return jsonb_build_object('id', created.id, 'name', created.name, 'icon_key', p_icon_key);
end;
$$;

create or replace function public.update_expense_category(p_category text, p_name text, p_icon_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  business uuid := public.owned_business_for_categories(p_icon_key);
  wanted text := btrim(p_name);
  own public.expense_categories;
begin
  -- The eight stay as they are, name and picture.
  if p_category = any (public.default_expense_categories()) then
    raise exception 'a default stays' using errcode = 'P0001', hint = 'EXPENSE_CATEGORY_DEFAULT_FIXED';
  end if;
  select * into own from public.expense_categories c
   where c.bakery_id = business and c.name = p_category
     for update;
  if not found then
    raise exception 'unknown expense category' using errcode = 'P0001', hint = 'EXPENSE_CATEGORY_UNKNOWN';
  end if;
  if wanted <> own.name then
    if public.names_default_expense_category(wanted) then
      raise exception 'a default category' using errcode = 'P0001', hint = 'EXPENSE_CATEGORY_ALREADY_EXISTS';
    end if;
    begin
      update public.expense_categories set name = wanted where id = own.id;
    exception when unique_violation then
      raise exception 'category taken' using errcode = 'P0001', hint = 'EXPENSE_CATEGORY_ALREADY_EXISTS';
    end;
    -- Its expenses and its picture move with it.
    update public.expenses set category = wanted where bakery_id = business and category = own.name;
    perform public.put_expense_category_icon(business, own.name, null);
  end if;
  perform public.put_expense_category_icon(business, wanted, p_icon_key);
  return jsonb_build_object('id', own.id, 'name', wanted, 'icon_key', p_icon_key);
end;
$$;

create or replace function public.delete_expense_category(p_category text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  business uuid := public.owned_business_for_categories(null);
  own public.expense_categories;
begin
  if p_category = any (public.default_expense_categories()) then
    raise exception 'a default stays' using errcode = 'P0001', hint = 'EXPENSE_CATEGORY_DEFAULT_FIXED';
  end if;
  select * into own from public.expense_categories c
   where c.bakery_id = business and c.name = p_category
     for update;
  if not found then
    raise exception 'unknown expense category' using errcode = 'P0001', hint = 'EXPENSE_CATEGORY_UNKNOWN';
  end if;
  if exists (select 1 from public.expenses e where e.bakery_id = business and e.category = own.name) then
    raise exception 'category has expenses' using errcode = 'P0001', hint = 'EXPENSE_CATEGORY_IN_USE';
  end if;
  delete from public.expense_categories where id = own.id;
  perform public.put_expense_category_icon(business, own.name, null);
  return jsonb_build_object('id', own.id, 'name', own.name);
end;
$$;

revoke all on function public.create_expense_category(text, text) from public, anon;
revoke all on function public.update_expense_category(text, text, text) from public, anon;
revoke all on function public.delete_expense_category(text) from public, anon;
grant execute on function public.create_expense_category(text, text) to authenticated;
grant execute on function public.update_expense_category(text, text, text) to authenticated;
grant execute on function public.delete_expense_category(text) to authenticated;
