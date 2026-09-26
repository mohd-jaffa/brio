-- ============================================================
-- Products need no categories (the user, 2026-09-25; plan §139.11 "Answers
-- and additions"; tracker R5.6).
--
-- A product is found by its name and known by its illustration, so nothing
-- reads or writes a category any more: there are no category chips, no
-- Manage categories and no /api/categories. What was left of them — the
-- `categories` table and `products.category_id` — goes, so no dead schema
-- stays behind (AGENTS.md §2.2).
--
-- Expenses keep their categories: those are `expenses.category`, a checked
-- text column, and are untouched here.
-- ============================================================

-- The composite reference to a category (0005) and the index on it go with
-- the column; they are named so the intent reads here.
drop index if exists public.products_bakery_category_idx;
alter table public.products drop constraint if exists products_category_same_bakery_fkey;
alter table public.products drop column if exists category_id;

-- Its policy, trigger, indexes and checks (0002, 0005, 0006) go with the table.
drop table if exists public.categories;
