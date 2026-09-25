import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0011_audit_writes.sql"), "utf8");

/**
 * The contract of 0011 (BUG-20). Proved on the local database as well: a
 * signed-in user reads their business's trail and is refused an INSERT with
 * "permission denied".
 */
describe("audit writes migration", () => {
  it("drops the policy that let a signed-in user write audit rows", () => {
    expect(migration).toMatch(/drop policy if exists audit_logs_insert_own on public\.audit_logs;/);
  });

  it("leaves a signed-in user SELECT and nothing else", () => {
    expect(migration).toMatch(/revoke insert, update, delete, truncate, references, trigger on public\.audit_logs from authenticated;/);
    expect(migration).not.toMatch(/revoke[^;]*select[^;]*audit_logs/i);
  });
});
