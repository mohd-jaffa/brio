import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0017_list_views.sql"), "utf8");

/**
 * The contract of 0017 (plan §139.10, §133.9 I4). Proved on the local database
 * as well: one `or` matches an order by its number, its customer's name or
 * their phone; the counts come back per customer; and a signed-out caller is
 * refused both views ("permission denied for view").
 */
describe("list views migration", () => {
  it("puts each order beside its customer's name and phone, Guests with neither", () => {
    expect(migration).toMatch(/create or replace view public\.order_search\s+with \(security_invoker = true\) as/);
    expect(migration).toMatch(/c\.name\s+as customer_name/);
    expect(migration).toMatch(/c\.phone as customer_phone/);
    expect(migration).toMatch(
      /left join public\.customers as c\s+on c\.bakery_id = o\.bakery_id and c\.id = o\.customer_id;/,
    );
  });

  it("counts each customer's orders and their last, cancelled ones not counted", () => {
    expect(migration).toMatch(/create or replace view public\.customer_stats\s+with \(security_invoker = true\) as/);
    expect(migration).toMatch(/count\(o\.id\) filter \(where o\.status <> 'CANCELLED'\)\s+as order_count/);
    expect(migration).toMatch(/max\(o\.created_at\) filter \(where o\.status <> 'CANCELLED'\)\s+as last_order_at/);
    expect(migration).toMatch(/group by c\.id;/);
  });

  it("reads as the caller, so row-level security still decides, and only for a signed-in user", () => {
    expect(migration.match(/security_invoker = true/g)).toHaveLength(2);
    expect(migration).toMatch(/revoke all on public\.order_search, public\.customer_stats from public, anon;/);
    expect(migration).toMatch(/grant select on public\.order_search, public\.customer_stats to authenticated;/);
    expect(migration).not.toMatch(/grant (insert|update|delete)/);
  });
});
