import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { AVATAR_KEYS } from "@/constants/avatars";

const read = (file: string) => readFileSync(join(process.cwd(), "supabase/migrations", file), "utf8");
const migration = read("0029_people_avatars.sql");
/** What the migration runs, without its comments. */
const statements = migration.replace(/--.*$/gm, "");
const keysOf = (sql: string) =>
  sql
    .match(/array\[([^\]]+)\]/)![1]
    .split(",")
    .map((key) => key.trim().replace(/'/g, ""));

/**
 * The contract of 0029 (the user, 2026-09-28). Proved on the local database
 * as well, rolled back: 33,000 draws land on all 33, each 956 to 1,042 times;
 * one of the people is taken, and a key that is none of them is refused.
 */
describe("people avatars migration", () => {
  it("takes every key the app has, in the app's order", () => {
    expect(keysOf(migration)).toEqual([...AVATAR_KEYS]);
    expect(migration).toMatch(
      /create or replace function public\.avatar_keys\(\)\s+returns text\[\]\s+language sql\s+immutable/,
    );
  });

  it("keeps every key 0026 took, so every account keeps its picture", () => {
    const before = keysOf(read("0026_profile_avatars.sql"));
    expect(keysOf(migration).slice(0, before.length)).toEqual(before);
  });

  it("leaves the draw, the column and its check as 0026 made them, and the function to the server", () => {
    expect(statements).not.toMatch(/random_avatar|alter table|constraint/);
    expect(migration).toContain("revoke all on function public.avatar_keys() from public, anon, authenticated;");
  });
});
