import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0019_stock_levels.sql"), "utf8");

/**
 * The contract of 0019 (plan §139.10, §20; R5.7). Proved on the local
 * database as well: each product's balance matches the sum of its ledger,
 * and `stocked` matches the oversell guard's test in 0015.
 */
describe("stock levels migration", () => {
  it("adds each product's ledger up in the database, one row per product", () => {
    expect(migration).toMatch(/create or replace view public\.stock_levels\s+with \(security_invoker = true\) as/);
    expect(migration).toMatch(/sum\(t\.quantity\)::integer\s+as balance/);
    expect(migration).toMatch(/group by t\.bakery_id, t\.product_id;/);
  });

  it("calls a product stocked by the oversell guard's own test (0015)", () => {
    const guard = readFileSync(join(process.cwd(), "supabase/migrations/0015_create_order.sql"), "utf8");
    const test = "bool_or(t.type in ('STOCK_IN', 'ADJUSTMENT', 'WASTAGE', 'RETURN'))";
    expect(guard).toContain(test);
    expect(migration).toContain(test);
  });

  it("is read-only, and only for a signed-in user", () => {
    expect(migration).toMatch(/revoke all on public\.stock_levels from public, anon;/);
    expect(migration).toMatch(/grant select on public\.stock_levels to authenticated;/);
    expect(migration).not.toMatch(/grant (insert|update|delete)/);
  });
});
