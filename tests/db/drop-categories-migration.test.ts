import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0018_drop_categories.sql"), "utf8");

/**
 * The contract of 0018 (plan §139.11, R5.6). Proved on the local database as
 * well: PostgREST no longer finds `categories`, and `products.category_id`
 * no longer exists, while products read as before.
 */
describe("drop categories migration", () => {
  it("takes the category off products, with its reference and index", () => {
    expect(migration).toMatch(/drop index if exists public\.products_bakery_category_idx;/);
    expect(migration).toMatch(
      /alter table public\.products drop constraint if exists products_category_same_bakery_fkey;/,
    );
    expect(migration).toMatch(/alter table public\.products drop column if exists category_id;/);
  });

  it("drops the categories table itself", () => {
    expect(migration).toMatch(/drop table if exists public\.categories;/);
  });

  it("leaves the expense categories alone", () => {
    expect(migration).not.toMatch(/alter table public\.expenses/);
  });
});
