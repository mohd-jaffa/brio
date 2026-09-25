import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0010_roles_user.sql"), "utf8");
const seed = readFileSync(join(process.cwd(), "supabase/seed.sql"), "utf8");

/** The contract of 0010 (plan §139.11.1): the owner's role is USER. */
describe("roles user migration", () => {
  it("renames BAKER to USER in place, so every profile follows without a rewrite", () => {
    expect(migration).toMatch(/alter type public\.user_role rename value 'BAKER' to 'USER';/);
  });

  it("makes USER the default for a new profile", () => {
    expect(migration).toMatch(/alter table public\.profiles alter column role set default 'USER';/);
  });

  it("seeds the owner as USER", () => {
    expect(seed).toMatch(/'Priya Baker', 'USER', v_bakery_id/);
    expect(seed).not.toMatch(/'BAKER'/);
  });
});
