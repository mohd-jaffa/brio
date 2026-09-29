import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { isErrorMessageCode } from "@/constants/messages";
import { DELIVERY_TYPES, OPEN_STATUSES, ORDER_STATUSES } from "@/constants/statuses";
import { nextStatuses } from "@/features/orders/lifecycle";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0025_edit_orders.sql"), "utf8");

/** The database's transition table, read out of `order_status_next`, as the app's lists. */
function databaseNext(status: string, deliveryType: string): string[] {
  // Up to the final else, which answers every other status with nothing.
  const body = migration.slice(migration.indexOf("select case p_status"), migration.indexOf("else array[]::text[]"));
  const branch = body.split(/\n\s+when '/).find((part) => part.startsWith(`${status}'`));
  if (!branch) return [];
  const arrays = [...branch.matchAll(/array\[([^\]]*)\]/g)].map((match) =>
    match[1]
      .split(",")
      .map((value) => value.trim().replace(/'/g, ""))
      .filter(Boolean),
  );
  // With two arrays, the first is for a delivery and the second for a pickup.
  return arrays.length === 2 ? arrays[deliveryType === "DELIVERY" ? 0 : 1] : arrays[0];
}

/** The body of `update_order`. */
const updateOrder = migration.slice(migration.indexOf("create or replace function public.update_order"));

/**
 * The contract of 0025 (plan §139.11.8 as revised, §139.11.13). Proved on the
 * local database as well, signed in as the owner, in a transaction rolled
 * back: an edit of #1003 — one more brownie box kept at its price, the bread
 * taken off, two cupcake boxes and a custom topper added, a discount — moved
 * the three products' stock by −1, +1 and −2, and left it part paid; a total
 * under the ₹500 paid, four cheesecakes against three in stock, a line of
 * another order, a kept line at another price or named twice, and totals that
 * did not add up were each refused with their own code; Pending went straight
 * to Completed and could then be neither edited nor moved; Preparing went
 * back to Pending posting no stock; out for delivery could not become a
 * pickup; another business's order read as not found; a new day cleared the
 * due and overdue notices and a new time on the same day did not; an edit
 * that changed no quantity posted no stock.
 */
describe("edit orders migration", () => {
  it.each(ORDER_STATUSES.flatMap((status) => DELIVERY_TYPES.map((type) => [status, type] as const)))(
    "allows from %s (%s) exactly the moves the app offers",
    (status, deliveryType) => {
      expect(databaseNext(status, deliveryType)).toEqual(nextStatuses(status, deliveryType));
    },
  );

  it("gives every line its place, numbered in the order it was inserted", () => {
    expect(migration).toMatch(
      /alter table public\.order_items add column position bigint generated always as identity;/,
    );
    expect(migration).toMatch(
      /create index order_items_order_position_idx on public\.order_items \(order_id, position\);/,
    );
  });

  it("locks the order, and changes only an open one", () => {
    expect(updateOrder).toMatch(/where o\.bakery_id = business and o\.id = p_order_id\s+for no key update;/);
    const open = OPEN_STATUSES.map((status) => `'${status}'`).join(", ");
    expect(updateOrder).toContain(`if current_order.status not in (${open}) then`);
    expect(updateOrder).toMatch(/hint = 'ORDER_NOT_EDITABLE'/);
    expect(updateOrder).toMatch(/current_order\.status = 'IN_TRANSIT'[\s\S]*?hint = 'ORDER_IN_TRANSIT_PICKUP'/);
  });

  it("keeps a kept line at its own product and price, and refuses one the order no longer has", () => {
    expect(updateOrder).toMatch(/i\.product_id is not distinct from \(line ->> 'product_id'\)::uuid/);
    expect(updateOrder).toMatch(/i\.unit_price = \(line ->> 'unit_price'\)::integer/);
    expect(updateOrder).toMatch(/count\(\*\) <> count\(distinct line ->> 'item_id'\)/);
    expect(updateOrder).toMatch(/hint = 'ORDER_CHANGED'/);
  });

  it("never lets the total fall below what has been paid, and derives the payment status again", () => {
    expect(updateOrder).toMatch(/if paid > order_total then[\s\S]*?hint = 'ORDER_TOTAL_BELOW_PAID'/);
    expect(updateOrder).toMatch(
      /when paid >= order_total then 'PAID'\s+when paid > 0 then 'PARTIALLY_PAID'\s+else 'UNPAID'/,
    );
  });

  it("moves the reservation by each product's change, after locking the products and checking stock for the growth", () => {
    expect(updateOrder).toMatch(/full join held as h on h\.product_id = w\.product_id/);
    expect(updateOrder).toMatch(/order by p\.id\s+for no key update;/);
    expect(updateOrder).toMatch(/stock_shortfalls\(\([\s\S]*?where \(c ->> 'quantity'\)::integer > 0/);
    expect(updateOrder).toMatch(/'ORDER_RESERVATION', -\(c ->> 'quantity'\)::integer, 'ORDER', p_order_id::text/);
    expect(updateOrder.indexOf("hint = 'ORDER_INSUFFICIENT_STOCK'")).toBeLessThan(
      updateOrder.indexOf("insert into public.inventory_transactions"),
    );
  });

  it("tells a moved due date's day afresh", () => {
    expect(updateOrder).toMatch(
      /due_notified_at = case[\s\S]*?\(new_date at time zone zone\)::date = \(o\.delivery_date at time zone zone\)::date/,
    );
    expect(updateOrder).toMatch(/overdue_notified_at = case/);
  });

  it("raises only codes the app has words for", () => {
    for (const [, hint] of migration.matchAll(/hint = '([A-Z_]+)'/g)) expect(isErrorMessageCode(hint)).toBe(true);
  });

  it("runs as the caller, so row-level security applies, and for signed-in users only", () => {
    expect(updateOrder).toMatch(/returns setof public\.orders\s+language plpgsql\s+security invoker/);
    expect(migration).toMatch(/revoke all on function public\.update_order\(uuid, jsonb\) from public, anon;/);
    expect(migration).toMatch(/grant execute on function public\.update_order\(uuid, jsonb\) to authenticated;/);
  });
});
