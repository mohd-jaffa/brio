import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PROFILE_CHANGE_DAYS } from "@/constants/limits";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0021_profile_changes.sql"), "utf8");

/** The body of one of the migration's functions. */
function body(name: string): string {
  const start = migration.indexOf(`create or replace function public.${name}(`);
  return migration.slice(start, migration.indexOf("$$;", start));
}

/**
 * The contract of 0021 (the user, 2026-09-26; R5.17). Proved on the local
 * database as well: a first change is taken and stamped, a second within 30
 * days is refused, a stamp cannot be written away, the field opens again
 * after 30 days, the business's name keeps the same rule, and the same value
 * again is no change.
 */
describe("profile changes migration", () => {
  it("waits as long as the app says", () => {
    expect(body("profile_change_interval")).toContain(`interval '${PROFILE_CHANGE_DAYS} days'`);
  });

  it("refuses a change inside the interval, in the app's words, and stamps one outside it", () => {
    const stamp = body("stamp_profile_change");
    expect(stamp).toContain("p_last > now() - public.profile_change_interval()");
    expect(stamp).toContain("hint = 'PROFILE_CHANGE_TOO_SOON'");
    expect(stamp).toContain("return now();");
  });

  it("holds the rule on the owner's name, sign-in number and email, keeping each date its own", () => {
    const guard = body("profiles_change_once_a_month");
    for (const field of ["name", "phone", "email"]) {
      expect(guard).toContain(
        `when new.${field} is distinct from old.${field} then public.stamp_profile_change(old.${field}_changed_at)`,
      );
      expect(guard).toContain(`else old.${field}_changed_at`);
    }
    expect(migration).toMatch(
      /before update of name, phone, email, name_changed_at, phone_changed_at, email_changed_at\s+on public\.profiles/,
    );
  });

  it("holds it on the business's name, whichever path changes it", () => {
    expect(body("bakeries_name_once_a_month")).toContain(
      "when new.business_name is distinct from old.business_name then public.stamp_profile_change(old.name_changed_at)",
    );
    expect(migration).toMatch(/before update of business_name, name_changed_at\s+on public\.bakeries/);
  });

  it("keeps a new email waiting, with only its link token's hash, looked up by it", () => {
    for (const column of [
      "pending_email citext",
      "pending_email_token_hash text",
      "pending_email_expires_at timestamptz",
    ]) {
      expect(migration).toContain(`add column ${column}`);
    }
    expect(migration).toMatch(
      /on public\.profiles \(pending_email_token_hash\)\s+where pending_email_token_hash is not null;/,
    );
  });

  it("gives no API role its functions", () => {
    for (const fn of [
      "stamp_profile_change(timestamptz)",
      "profiles_change_once_a_month()",
      "bakeries_name_once_a_month()",
    ]) {
      expect(migration).toContain(`revoke all on function public.${fn} from public, anon, authenticated;`);
    }
  });
});
