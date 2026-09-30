import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { LOG_KEEP_DAYS } from "@/constants/logs";
import { ERROR_SOURCES } from "@/constants/statuses";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0036_error_logs.sql"), "utf8");

describe("0036_error_logs", () => {
  it("keeps where each failure happened in the words the app uses", () => {
    expect(migration).toContain(`check (source in (${ERROR_SOURCES.map((source) => `'${source}'`).join(", ")}))`);
  });

  it("lets nobody signed in read or write the error log: the server writes it, the console reads it", () => {
    expect(migration).toContain("alter table public.error_logs enable row level security;");
    expect(migration).toContain("revoke all on public.error_logs from public, anon, authenticated;");
    expect(migration).toContain("grant select, insert, delete on public.error_logs to service_role;");
    expect(migration).not.toMatch(/create policy/i);
  });

  it("goes with a deleted account's business, and forgets a deleted person", () => {
    expect(migration).toContain("bakery_id uuid references public.bakeries(id) on delete cascade");
    expect(migration).toContain("user_id uuid references public.profiles(id) on delete set null");
  });

  it("drops audit and error rows after as many days as the app says, every hour", () => {
    expect(migration).toContain(
      `delete from public.audit_logs where created_at < now() - interval '${LOG_KEEP_DAYS} days'`,
    );
    expect(migration).toContain(
      `delete from public.error_logs where created_at < now() - interval '${LOG_KEEP_DAYS} days'`,
    );
    expect(migration).toContain("revoke all on function public.clean_up_logs() from public, anon, authenticated;");
    expect(migration).toContain("grant execute on function public.clean_up_logs() to service_role;");
    expect(migration).toContain(
      "select cron.schedule('log-cleanup', '23 * * * *', $$select public.clean_up_logs()$$);",
    );
  });
});
