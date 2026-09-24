-- ============================================================
-- Illustrations (plan §139.11.10, §139.12, tracker R1.16).
--
-- A product, and each expense category, shows an illustration from the
-- library the app ships. Only the key is stored. The database checks the key's
-- shape; the server checks it against the library (src/constants/
-- illustrations.ts), so adding an illustration needs no migration, and a key
-- the library later drops shows the default rather than failing.
-- ============================================================

-- products.image was reserved for a photo upload the plan never allowed (§16),
-- and nothing ever wrote it. It becomes the product's illustration key.
alter table public.products rename column image to icon_key;

update public.products
set icon_key = null
where icon_key is not null
  and (icon_key !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(icon_key) > 64);

alter table public.products
  add constraint products_icon_key_shape
  check (icon_key is null or (icon_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(icon_key) <= 64));

-- An expense's picture belongs to its category, chosen once per business:
-- { "Ingredients": "shopping-bags", … }. A category it does not mention uses
-- the default receipt.
alter table public.bakeries
  add column expense_category_icons jsonb not null default '{}'::jsonb;

alter table public.bakeries
  add constraint bakeries_expense_category_icons_object
  check (jsonb_typeof(expense_category_icons) = 'object');
