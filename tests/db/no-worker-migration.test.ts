import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { WORKER_ENABLED } from "@/constants/jobs";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0027_no_worker.sql"), "utf8");

/** The body of one of the migration's functions. */
function body(name: string): string {
  const start = migration.indexOf(`create or replace function public.${name}(`);
  return migration.slice(start, migration.indexOf("$$;", start));
}

/**
 * The contract of 0027 (the user, 2026-09-27). Proved on the local database
 * as well, rolled back: a notification queued with no worker is not taken,
 * and a queued email still is; one business's orders due today, tomorrow and
 * yesterday are each handed back once, with none before its morning and none
 * for another business; and a signed-in user cannot call it.
 */
describe("no worker migration", () => {
  it("says whether a worker runs as the app does", () => {
    expect(body("worker_enabled")).toContain(`select ${WORKER_ENABLED}`);
    expect(body("worker_enabled")).toContain("immutable");
  });

  it("holds back only a notification, and only while no worker runs", () => {
    expect(body("jobs_hold_notifications")).toContain(
      "if new.type = 'SEND_PUSH_NOTIFICATION' and not public.worker_enabled() then\n    return null;",
    );
    expect(body("jobs_hold_notifications")).toContain("return new;");
    expect(migration).toMatch(/create trigger jobs_hold_notifications\s+before insert on public\.jobs\s+for each row/);
  });

  it("takes orders long past their day as known, so the first look does not tell of all of them", () => {
    expect(migration).toContain("and o.overdue_notified_at is null");
    expect(migration).toContain("< (now() at time zone b.timezone)::date - 1;");
  });

  it("tells one business of what is due soon and overdue, once each, from its morning, as 0023's sweep does", () => {
    const take = body("take_due_order_notices");
    expect(take.match(/and o\.bakery_id = p_bakery_id/g)).toHaveLength(2);
    expect(take).toContain("set due_notified_at = now()");
    expect(take).toContain("and o.due_notified_at is null");
    expect(take).toContain("set overdue_notified_at = now()");
    expect(take).toContain("and o.overdue_notified_at is null");
    expect(take.match(/extract\(hour from now\(\) at time zone b\.timezone\) >= p_from_hour/g)).toHaveLength(2);
    expect(take).toContain("case when d.today then 'TODAY' else 'TOMORROW' end");
    expect(take).toContain("to_char(l.day, 'YYYY-MM-DD')");
  });

  it("hands back facts in the shape the app reads, and is the server's alone", () => {
    expect(migration).toContain(
      "returns table (kind text, order_id uuid, order_number text, customer_name text, due_day text, due_date text)",
    );
    expect(migration).toContain(
      "revoke all on function public.take_due_order_notices(uuid, integer) from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "grant execute on function public.take_due_order_notices(uuid, integer) to service_role;",
    );
  });
});
