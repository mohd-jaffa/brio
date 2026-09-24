import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0007_illustrations.sql"), "utf8");

/** The contract of 0007 (plan §139.11.10, §139.12). */
describe("illustrations migration", () => {
  it("turns the never-used product image into an illustration key", () => {
    expect(migration).toMatch(/rename column image to icon_key/);
    expect(migration).toMatch(/check \(icon_key is null or \(icon_key ~ '\^\[a-z0-9\]\+\(-\[a-z0-9\]\+\)\*\$' and char_length\(icon_key\) <= 64\)\)/);
  });

  it("clears any stored value that is not a key before the check applies", () => {
    expect(migration).toMatch(/update public\.products\s+set icon_key = null/);
  });

  it("keeps each business's expense-category pictures as one object", () => {
    expect(migration).toMatch(/add column expense_category_icons jsonb not null default '\{\}'::jsonb/);
    expect(migration).toMatch(/jsonb_typeof\(expense_category_icons\) = 'object'/);
  });
});
