import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0006_text_hygiene.sql"), "utf8");

/**
 * The contract of 0006 (plan §139.7). Proved against the local database when it
 * was written: a blank or over-long name refused (23514), and " cakes " refused
 * beside "Cakes" in the same business (23505).
 */
describe("text hygiene migration", () => {
  it("bounds each name, trimmed, to what its schema allows", () => {
    expect(migration).toMatch(/customers_name_length check \(char_length\(btrim\(name\)\) between 1 and 100\)/);
    expect(migration).toMatch(/products_name_length check \(char_length\(btrim\(name\)\) between 1 and 200\)/);
    expect(migration).toMatch(/categories_name_length check \(char_length\(btrim\(name\)\) between 1 and 60\)/);
  });

  it("keeps category names unique within a business, whatever their case or spacing", () => {
    expect(migration).toMatch(
      /unique index if not exists categories_bakery_name_unique\s+on public\.categories \(bakery_id, lower\(btrim\(name\)\)\)/,
    );
  });
});
