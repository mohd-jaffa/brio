import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { JOB_TYPES } from "@/constants/jobs";
import { isErrorMessageCode } from "@/constants/messages";
import { DELIVERY_TYPES, ORDER_STATUSES } from "@/constants/statuses";
import { nextStatuses } from "@/features/orders/lifecycle";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0016_change_order_status.sql"), "utf8");

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

/**
 * The contract of 0016 (§133.3 C6, §139.11.8). Proved on the local database as
 * well, signed in as the owner: a move from a status the order had left was
 * refused as changed elsewhere; Out for delivery on a pickup was refused;
 * Preparing → Ready → Completed released the reservation and posted the
 * consumption; each move queued one notification, and a refused one none.
 */
describe("change order status migration", () => {
  // 0025_edit_orders.sql widened the table (the user, 2026-09-27); its test
  // keeps it equal to the app's. Every move this one allowed is still allowed.
  it.each(ORDER_STATUSES.flatMap((status) => DELIVERY_TYPES.map((type) => [status, type] as const)))(
    "every move it allowed from %s (%s) the app still offers",
    (status, deliveryType) => {
      expect(nextStatuses(status, deliveryType)).toEqual(expect.arrayContaining(databaseNext(status, deliveryType)));
    },
  );

  it("locks the order and refuses a move from anywhere but where it was read", () => {
    expect(migration).toMatch(/where o\.bakery_id = business and o\.id = p_order_id\s+for no key update;/);
    expect(migration).toMatch(/if moved\.status is distinct from p_from then[\s\S]*?hint = 'ORDER_STATUS_CHANGED'/);
  });

  it("releases the reservation on delivery and cancel, and consumes on delivery, for catalogue lines only", () => {
    expect(migration).toMatch(
      /if p_to in \('DELIVERED', 'CANCELLED'\) then[\s\S]*?'ORDER_RESERVATION', i\.quantity[\s\S]*?i\.product_id is not null;/,
    );
    expect(migration).toMatch(
      /if p_to = 'DELIVERED' then[\s\S]*?'ORDER_CONSUMPTION', -i\.quantity[\s\S]*?i\.product_id is not null;/,
    );
  });

  it("queues the notification in the same transaction, as facts, under the app's job type", () => {
    expect(migration).toContain(`'${JOB_TYPES.pushNotification}'`);
    expect(migration).toMatch(/'kind', 'ORDER_STATUS'/);
  });

  it("raises only codes the app has words for", () => {
    for (const [, hint] of migration.matchAll(/hint = '([A-Z_]+)'/g)) expect(isErrorMessageCode(hint)).toBe(true);
  });

  it("runs as the caller, so row-level security applies, and for signed-in users only", () => {
    expect(migration).toMatch(
      /function public\.change_order_status\(p_order_id uuid, p_from text, p_to text\)[\s\S]*?security invoker/,
    );
    expect(migration).toMatch(
      /grant execute on function public\.change_order_status\(uuid, text, text\) to authenticated;/,
    );
    expect(migration).toMatch(
      /revoke all on function public\.change_order_status\(uuid, text, text\) from public, anon;/,
    );
  });
});
