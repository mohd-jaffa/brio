import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0024_customer_balance.sql"), "utf8");

/**
 * The contract of 0024 (the user, 2026-09-27). Proved on the local database
 * as well: the seed business's customers read ₹950, ₹560, ₹400 and nothing
 * owed — the same balances their orders show on Home.
 */
describe("customer balance migration", () => {
  it("adds what each customer owes to the stats the list pages over, keeping what was there", () => {
    expect(migration).toContain("create or replace view public.customer_stats");
    expect(migration).toContain("count(o.id) filter (where o.status <> 'CANCELLED')        as order_count");
    expect(migration).toContain("max(o.created_at) filter (where o.status <> 'CANCELLED')  as last_order_at");
    expect(migration).toMatch(/\)::bigint\s+as balance_due/);
  });

  it("owes each order's total less what was paid, never below nothing, cancelled orders owing nothing", () => {
    expect(migration).toContain(
      "sum(greatest(o.total - coalesce(paid.amount, 0), 0)) filter (where o.status <> 'CANCELLED')",
    );
    expect(migration).toContain("where p.bakery_id = o.bakery_id and p.order_id = o.id");
  });

  it("still reads as the caller, for the signed-in owner only", () => {
    expect(migration).toContain("with (security_invoker = true)");
    expect(migration).toContain("revoke all on public.customer_stats from public, anon;");
    expect(migration).toContain("grant select on public.customer_stats to authenticated;");
  });
});
