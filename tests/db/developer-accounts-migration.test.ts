import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0028_developer_accounts.sql"), "utf8");

/**
 * The contract of 0028 (the user, 2026-09-27; plan §5, §37). Proved on the
 * local database as well: a developer's profile with no business is taken,
 * and an owner's without one is refused.
 */
describe("developer accounts migration", () => {
  it("lets a profile name no business, and only a developer's", () => {
    expect(migration).toContain("alter table public.profiles alter column bakery_id drop not null;");
    expect(migration).toMatch(
      /add constraint profiles_owner_has_business check \(role = 'DEV' or bakery_id is not null\);/,
    );
  });

  it("changes nothing else: no new table, policy or grant", () => {
    expect(migration).not.toMatch(/create (table|policy)|grant /i);
  });
});
