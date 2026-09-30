import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0034_service_role_functions.sql"), "utf8");
const statements = migration
  .split("\n")
  .filter((line) => !line.startsWith("--"))
  .join("\n");

/**
 * The contract of 0034: the service role runs every function in `public`,
 * those there now and those added later, whatever defaults the database was
 * made with. Proved on a database made fresh by the integration tests in CI.
 */
describe("service role functions migration", () => {
  it("grants the service role every function there is", () => {
    expect(statements).toContain("grant execute on all functions in schema public to service_role;");
  });

  it("grants it every function added later", () => {
    expect(statements).toMatch(
      /alter default privileges in schema public\s+grant execute on functions to service_role;/,
    );
  });

  it("gives the API's other roles nothing", () => {
    expect(statements).not.toMatch(/\b(anon|authenticated|public)\s*;/);
  });
});
