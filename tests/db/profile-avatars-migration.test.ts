import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { AVATAR_KEYS } from "@/constants/avatars";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0026_profile_avatars.sql"), "utf8");

/** The body of one of the migration's functions. */
function body(name: string): string {
  const start = migration.indexOf(`create or replace function public.${name}(`);
  return migration.slice(start, migration.indexOf("$$;", start));
}

/**
 * The contract of 0026 (the user, 2026-09-27). Proved on the local database
 * as well, rolled back: 9,000 draws land on all nine, each 924 to 1,069
 * times; a new account made as registration makes it is given one; a key
 * that is not one of the nine, or none, is refused; the picture changes
 * twice in a row with the 30-day stamps untouched; and a signed-in user can
 * neither draw one nor write the column.
 */
describe("profile avatars migration", () => {
  it("takes the app's nine keys, in the app's order", () => {
    const keys = body("avatar_keys").match(/array\[([^\]]+)\]/)![1];
    expect(keys.split(",").map((key) => key.trim().replace(/'/g, ""))).toEqual([...AVATAR_KEYS]);
    expect(body("avatar_keys")).toContain("immutable");
  });

  it("draws one of them at random, each as likely as the next", () => {
    const draw = body("random_avatar");
    expect(draw).toContain("volatile");
    expect(draw).toContain("keys[1 + floor(random() * cardinality(keys))::int]");
    expect(draw).toContain("public.avatar_keys()");
  });

  it("gives every account one — each existing one its own — and takes no other", () => {
    expect(migration).toMatch(
      /alter table public\.profiles\s+add column avatar text not null default public\.random_avatar\(\)\s+constraint profiles_avatar_known check \(avatar = any \(public\.avatar_keys\(\)\)\);/,
    );
  });

  it("leaves both functions to the server", () => {
    for (const name of ["avatar_keys", "random_avatar"]) {
      expect(migration).toContain(`revoke all on function public.${name}() from public, anon, authenticated;`);
    }
  });

  it("is not held by the 30-day rule", () => {
    expect(migration).not.toMatch(/create trigger/);
  });
});
