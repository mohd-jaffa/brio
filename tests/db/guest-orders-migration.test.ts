import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0014_guest_orders.sql"), "utf8");

/**
 * The contract of 0014 (plan §139.11.3). Proved on the local database as well:
 * a Guest order inserts, and an order naming another business's customer is
 * still refused by the composite reference.
 */
describe("guest orders migration", () => {
  it("lets an order have no customer, which is a Guest", () => {
    expect(migration).toMatch(/alter table public\.orders alter column customer_id drop not null;/);
  });

  it("indexes the Guest orders by business and time, and only them", () => {
    expect(migration).toMatch(/on public\.orders \(bakery_id, created_at\)\s+where customer_id is null;/);
  });
});
