-- ============================================================
-- Text hygiene (plan §139.7, tracker R1.11).
--
-- The app normalises every name before it is stored — trimmed, whitespace
-- collapsed, invisible characters removed — and bounds it to the lengths its
-- schemas use (src/lib/validation). These repeat the part the database can
-- check, so a write that skips the app cannot store a blank name, a name of
-- spaces, or one longer than a form allows.
-- ============================================================

alter table public.customers
  add constraint customers_name_length check (char_length(btrim(name)) between 1 and 100);

alter table public.products
  add constraint products_name_length check (char_length(btrim(name)) between 1 and 200);

-- 60 matches the category schema that comes with managing categories (R5.6):
-- a category is a chip on a phone, not a sentence.
alter table public.categories
  add constraint categories_name_length check (char_length(btrim(name)) between 1 and 60);

-- "Cakes", "cakes" and " Cakes" are one category within a business.
create unique index if not exists categories_bakery_name_unique
  on public.categories (bakery_id, lower(btrim(name)));
