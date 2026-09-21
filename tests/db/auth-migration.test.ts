import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260921170000_auth_foundation.sql"),
  "utf8",
);

describe("auth foundation migration", () => {
  it("creates the required auth-owned tables", () => {
    assert.match(migration, /create table if not exists public\.profiles/i);
    assert.match(migration, /create table if not exists public\.bakeries/i);
  });

  it("enforces phone and email uniqueness for accounts", () => {
    assert.match(migration, /phone text not null unique/i);
    assert.match(migration, /email citext not null unique/i);
  });

  it("enables RLS and own-tenant read policies", () => {
    assert.match(migration, /alter table public\.bakeries enable row level security/i);
    assert.match(migration, /alter table public\.profiles enable row level security/i);
    assert.match(migration, /create policy profiles_select_own/i);
    assert.match(migration, /create policy bakeries_select_own/i);
    assert.match(migration, /current_profile_bakery_id\(\)/i);
  });
});
