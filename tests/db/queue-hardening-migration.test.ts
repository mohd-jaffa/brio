import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { JOB_KEEP_COMPLETED_DAYS, JOB_KEEP_FAILED_DAYS } from "@/constants/jobs";

const read = (name: string) => readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8");
const migration = read("0032_queue_hardening.sql");
const before = read("0016_change_order_status.sql");

/** The body of `change_order_status`, from its declaration to its end. */
const changeOrderStatus = (sql: string) =>
  sql.slice(
    sql.indexOf("create or replace function public.change_order_status"),
    sql.indexOf("end;\n$$;", sql.indexOf("create or replace function public.change_order_status")),
  );

/**
 * The contract of 0032 (R6.1; §133.6 F7, F8). Proved on the local database as
 * well: a signed-in user's insert into `jobs` is refused, and moving an order
 * still queues its notice when a worker runs.
 */
describe("queue hardening migration", () => {
  it("lets no signed-in user queue work: the server queues, and the database's triggers as their owner", () => {
    expect(migration).toContain("drop policy if exists jobs_insert_authenticated on public.jobs;");
    expect(migration).toContain("revoke insert on public.jobs from authenticated;");
    for (const trigger of ["notify_order_placed", "notify_customer_added", "notify_stock_low"]) {
      expect(migration).toContain(`alter function public.${trigger}() security definer;`);
    }
  });

  it("tells of an order's move from a trigger on its status, as its owner, only when it changes", () => {
    expect(migration).toMatch(/function public\.notify_order_status\(\)[\s\S]*?security definer/);
    expect(migration).toContain("'kind', 'ORDER_STATUS'");
    expect(migration).toContain("after update of status on public.orders");
    expect(migration).toContain("when (old.status is distinct from new.status)");
    expect(migration).toContain(
      "revoke all on function public.notify_order_status() from public, anon, authenticated;",
    );
  });

  it("moves an order as 0016 did, less the insert the user may no longer make", () => {
    const now = changeOrderStatus(migration);
    expect(now).toContain("security invoker");
    expect(now).not.toContain("insert into public.jobs");
    const withoutNotice = changeOrderStatus(before)
      .replace(/\n {2}-- Queued in the same transaction[\s\S]*?\n {2}\);\n/, "\n")
      .replace(/\s+/g, " ");
    const redefined = now
      .replace(/\n {2}-- The notification follows from orders_notify_status, in this transaction\./, "")
      .replace(/\s+/g, " ");
    expect(redefined).toBe(withoutNotice);
  });

  it("keeps finished jobs as long as the app says, and cleans daily while no worker does", () => {
    expect(migration).toContain(
      `status = 'completed' and completed_at < now() - interval '${JOB_KEEP_COMPLETED_DAYS} days'`,
    );
    expect(migration).toContain(`status = 'failed' and created_at < now() - interval '${JOB_KEEP_FAILED_DAYS} days'`);
    expect(migration).toContain("grant execute on function public.clean_up_queue() to service_role;");
    expect(migration).toContain("revoke all on function public.clean_up_queue() from public, anon, authenticated;");
    expect(migration).toContain("$$select public.clean_up_queue() where not public.worker_enabled()$$");
  });
});
