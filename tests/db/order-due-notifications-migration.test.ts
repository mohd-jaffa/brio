import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { JOB_TYPES } from "@/constants/jobs";
import { OPEN_STATUSES } from "@/constants/statuses";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0023_order_due_notifications.sql"), "utf8");
const open = `o.status in (${OPEN_STATUSES.map((status) => `'${status}'`).join(", ")})`;

/**
 * The contract of 0023 (plan §25; the user, 2026-09-26; R5.10). Proved on
 * the local database as well: a first sweep queued five orders due tomorrow
 * and yesterday's overdue one, a second queued none, one run before the hour
 * queued none, and a signed-in user may not run it.
 */
describe("order due notifications migration", () => {
  it("keeps, on each order, when it was told it is due and when overdue", () => {
    expect(migration).toContain("add column due_notified_at timestamptz");
    expect(migration).toContain("add column overdue_notified_at timestamptz");
  });

  it("counts days in each business's own timezone, as the app does (IMP-05)", () => {
    expect(migration).toContain(
      "between (now() at time zone b.timezone)::date and (now() at time zone b.timezone)::date + 1",
    );
    expect(migration).toContain(
      "(o.delivery_date at time zone b.timezone)::date < (now() at time zone b.timezone)::date\n",
    );
  });

  it("tells only open orders, each once, from the hour it is given", () => {
    // Both sweeps, and the orders taken as known on the way in.
    expect(migration.match(new RegExp(open.replace(/[()]/g, "\\$&"), "g"))).toHaveLength(3);
    expect(migration).toContain("and o.due_notified_at is null");
    expect(migration).toContain("and o.overdue_notified_at is null");
    expect(migration.match(/extract\(hour from now\(\) at time zone b\.timezone\) >= p_from_hour/g)).toHaveLength(2);
  });

  it("marks and queues in one statement, as facts, on the worker's queue", () => {
    expect(migration.match(new RegExp(`'${JOB_TYPES.pushNotification}'`, "g"))).toHaveLength(2);
    expect(migration).toContain("'kind', 'ORDER_DUE'");
    expect(migration).toContain("'day', case when d.today then 'TODAY' else 'TOMORROW' end");
    expect(migration).toContain("'kind', 'ORDER_OVERDUE'");
    expect(migration).toContain("'dueDate', to_char(l.due_day, 'YYYY-MM-DD')");
    expect(migration).toMatch(/with due as \(\s+update public\.orders/);
    expect(migration).toMatch(/with overdue as \(\s+update public\.orders/);
  });

  it("takes orders long past their day as known when it arrives", () => {
    expect(migration).toMatch(
      /set overdue_notified_at = now\(\)[\s\S]+< \(now\(\) at time zone b\.timezone\)::date - 1;/,
    );
  });

  it("is the worker's alone", () => {
    expect(migration).toContain(
      "revoke all on function public.queue_due_order_notifications(integer) from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "grant execute on function public.queue_due_order_notifications(integer) to service_role;",
    );
  });
});
