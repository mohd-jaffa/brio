import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0030_account_deletion.sql"), "utf8");

const position = (statement: string) => {
  const at = migration.indexOf(statement);
  expect(at, statement).toBeGreaterThan(-1);
  return at;
};

/**
 * The contract of 0030 (R8.10; the user, 2026-09-28). Proved on the local
 * database as well: an owner deleted from the app leaves no profile, business,
 * customer, order, job or sign-in behind.
 */
describe("account deletion migration", () => {
  it("runs as its owner, with no search path to be misled by", () => {
    expect(migration).toContain("create or replace function public.delete_account(p_user_id uuid)");
    expect(migration).toMatch(/returns uuid\s+language plpgsql\s+security definer\s+set search_path = ''/);
  });

  it("is the server's alone: no signed-in user or visitor may call it", () => {
    expect(migration).toContain("revoke all on function public.delete_account(uuid) from public, anon, authenticated;");
    expect(migration).toContain("grant execute on function public.delete_account(uuid) to service_role;");
  });

  it("deletes only an owner, and says so in the catalogue when there is none", () => {
    expect(migration).toContain("where p.id = p_user_id and p.role = 'USER'");
    expect(migration).toContain("for update;");
    expect(migration).toContain("errcode = 'P0001', hint = 'RECORD_NOT_FOUND'");
  });

  it("clears the queue's work, then the profile, the business and the sign-in, in that order", () => {
    const jobs = position("delete from public.jobs as j");
    const profile = position("delete from public.profiles as p where p.id = p_user_id;");
    const business = position("delete from public.bakeries as b where b.id = business and b.owner_id = p_user_id;");
    const signIn = position("delete from auth.users as u where u.id = p_user_id;");
    expect(jobs).toBeLessThan(profile);
    expect(profile).toBeLessThan(business);
    expect(business).toBeLessThan(signIn);
    expect(migration).toContain("j.payload ->> 'userId' = p_user_id::text");
    expect(migration).toContain("j.payload ->> 'bakeryId' = business::text");
  });

  it("answers the business, so the server can remove its logo", () => {
    expect(migration).toContain("return business;");
  });

  it("adds no table, policy or column", () => {
    expect(migration).not.toMatch(/create (table|policy)|alter table/i);
  });
});
