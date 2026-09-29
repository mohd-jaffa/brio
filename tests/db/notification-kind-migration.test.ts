import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { JOB_TYPES } from "@/constants/jobs";
import { LOW_STOCK_THRESHOLD } from "@/constants/inventory";
import { NOTIFICATION_KINDS } from "@/constants/statuses";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0022_notification_kind.sql"), "utf8");

/** The body of one of the migration's functions. */
function body(name: string): string {
  const start = migration.indexOf(`create or replace function public.${name}(`);
  return migration.slice(start, migration.indexOf("$$;", start));
}

/**
 * The contract of 0022 (plan §139.12, §133.5 E1; R5.10). Proved on the local
 * database as well: a product counted at 8 alerts once as it falls to 4 —
 * two order lines in one statement included — not again at 3, not for a
 * delivered order of something already low, again after a restock falls to
 * 5, and never for one nobody counts; a customer added and an order placed
 * each queue theirs; the owner may not write a notification or change its
 * words, only mark it read.
 */
describe("notification kind migration", () => {
  it("files every notification under one of the app's kinds", () => {
    expect(migration).toContain("add column kind text not null default 'SYSTEM'");
    expect(migration).toContain("alter column kind drop default");
    expect(migration).toContain(`check (kind in (${NOTIFICATION_KINDS.map((kind) => `'${kind}'`).join(", ")}))`);
  });

  it("reads a business's newest first, and counts its unread", () => {
    expect(migration).toContain("on public.notifications (bakery_id, created_at desc, id)");
    expect(migration).toContain("on public.notifications (bakery_id, is_read, created_at desc)");
    expect(migration).toContain("drop index if exists public.idx_notifications_is_read");
  });

  it("lets the owner mark one read and nothing else", () => {
    expect(migration).toContain("revoke insert, update on public.notifications from authenticated");
    expect(migration).toContain("grant update (is_read) on public.notifications to authenticated");
  });

  it("calls stock low at the same mark as Home and Inventory", () => {
    expect(body("low_stock_mark")).toContain(`select ${LOW_STOCK_THRESHOLD}`);
  });

  it("queues each event as facts, on the queue the worker drains", () => {
    for (const [fn, kind] of [
      ["notify_order_placed", "ORDER_PLACED"],
      ["notify_customer_added", "CUSTOMER_ADDED"],
      ["notify_stock_low", "STOCK_LOW"],
    ]) {
      expect(body(fn)).toContain(`'${JOB_TYPES.pushNotification}'`);
      expect(body(fn)).toContain(`'kind', '${kind}'`);
    }
    expect(body("notify_order_placed")).toContain(
      "(select c.name from public.customers as c where c.id = new.customer_id)",
    );
  });

  it("alerts once as stock crosses the mark, for a counted product on sale, never for a consumption", () => {
    const low = body("notify_stock_low");
    expect(low).toContain("where m.type <> 'ORDER_CONSUMPTION'");
    expect(low).toContain("where change.moved < 0");
    expect(low).toContain("and p.is_active");
    expect(low).toContain("and level.stocked");
    expect(low).toContain("and level.balance <= public.low_stock_mark()");
    expect(low).toContain("and level.balance - change.moved > public.low_stock_mark()");
    expect(migration).toMatch(
      /after insert on public\.inventory_transactions\s+referencing new table as moved\s+for each statement execute function public\.notify_stock_low\(\)/,
    );
  });

  it("fires after an order and a customer are written", () => {
    expect(migration).toMatch(
      /after insert on public\.orders\s+for each row execute function public\.notify_order_placed\(\)/,
    );
    expect(migration).toMatch(
      /after insert on public\.customers\s+for each row execute function public\.notify_customer_added\(\)/,
    );
  });

  it("gives no API role a trigger's function, and the signed-in owner the mark", () => {
    for (const fn of ["notify_order_placed()", "notify_customer_added()", "notify_stock_low()"]) {
      expect(migration).toContain(`revoke all on function public.${fn} from public, anon, authenticated;`);
    }
    expect(migration).toContain("grant execute on function public.low_stock_mark() to authenticated;");
  });
});
