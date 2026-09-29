import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0009_role_out_of_metadata.sql"), "utf8");
const seed = readFileSync(join(process.cwd(), "supabase/seed.sql"), "utf8");

/** The contract of 0009 (BUG-17): no role is left where a user can edit it. */
describe("role out of metadata migration", () => {
  it("removes the role from every account's user_metadata", () => {
    expect(migration).toMatch(
      /update auth\.users\s+set raw_user_meta_data = raw_user_meta_data - 'role'\s+where raw_user_meta_data \? 'role';/,
    );
  });

  it("does not seed one back", () => {
    expect(seed).not.toMatch(/raw_user_meta_data[\s\S]{0,400}'role'/);
    expect(seed).toMatch(/jsonb_build_object\('name', 'Priya Baker'\),/);
  });
});
