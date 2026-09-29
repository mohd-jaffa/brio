import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0001_auth_foundation.sql"), "utf8");

describe("auth foundation migration", () => {
  it("creates the required auth-owned tables", () => {
    expect(migration).toMatch(/create table if not exists public\.profiles/i);
    expect(migration).toMatch(/create table if not exists public\.bakeries/i);
  });

  it("enforces phone and email uniqueness for accounts", () => {
    expect(migration).toMatch(/phone text not null unique/i);
    expect(migration).toMatch(/email citext not null unique/i);
  });

  it("enables RLS and own-tenant read policies", () => {
    expect(migration).toMatch(/alter table public\.bakeries enable row level security/i);
    expect(migration).toMatch(/alter table public\.profiles enable row level security/i);
    expect(migration).toMatch(/create policy profiles_select_own/i);
    expect(migration).toMatch(/create policy bakeries_select_own/i);
    expect(migration).toMatch(/current_profile_bakery_id\(\)/i);
  });
});
