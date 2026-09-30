import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0035_welcome.sql"), "utf8");
const statements = migration
  .split("\n")
  .filter((line) => !line.startsWith("--"))
  .join("\n");

/**
 * The contract of 0035 (plan §139.11.20): a new account has not been
 * welcomed; every account made before it has. Proved on the local database by
 * the integration tests.
 */
describe("welcome migration", () => {
  it("adds when the owner was welcomed, filled for every account there is", () => {
    expect(statements).toContain("alter table public.profiles add column welcomed_at timestamptz default now();");
  });

  it("then starts a new account without it", () => {
    expect(statements).toContain("alter table public.profiles alter column welcomed_at drop default;");
    expect(statements).not.toMatch(/not null/);
  });

  it("fills the rows as the column is added, not with an update that would fire their triggers", () => {
    expect(statements).not.toMatch(/\bupdate\b/i);
  });

  it("grants the API nothing new: profiles stay the server's to write", () => {
    expect(statements).not.toMatch(/\bgrant\b/i);
  });
});
