import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DEVICE_PLATFORMS } from "@/constants/statuses";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0031_web_push.sql"), "utf8");

/**
 * The contract of 0031 (R8.6; the user, 2026-09-29). Proved on the local
 * database as well: the schedule is in cron.job, a signed-in user can neither
 * read the table nor call the function, and nothing is called while no
 * browser wants pushes.
 */
describe("web push migration", () => {
  it("keeps each browser against its business and its owner, and goes with either", () => {
    expect(migration).toContain("create table public.device_tokens (");
    expect(migration).toContain("bakery_id uuid not null references public.bakeries(id) on delete cascade");
    expect(migration).toContain("profile_id uuid not null references public.profiles(id) on delete cascade");
    expect(migration).toMatch(/token text not null constraint device_tokens_token_unique unique/);
  });

  it("knows the platforms the app names, and bounds every column the browser gives", () => {
    const listed = migration.match(/check \(platform in \(([^)]*)\)\)/)?.[1];
    expect(listed?.split(",").map((value) => value.trim().replace(/'/g, ""))).toEqual([...DEVICE_PLATFORMS]);
    expect(migration).toContain("check (char_length(token) between 1 and 1024)");
    expect(migration).toContain("check (char_length(p256dh) between 1 and 200)");
    expect(migration).toContain("check (char_length(auth) between 1 and 100)");
  });

  it("is the server's alone: no policy, and nothing granted to a user or a visitor", () => {
    expect(migration).toContain("alter table public.device_tokens enable row level security;");
    expect(migration).toContain("revoke all on public.device_tokens from anon, authenticated;");
    expect(migration).not.toMatch(/create policy/i);
    expect(migration).toContain("revoke all on function public.request_due_order_sweep() from public, anon, authenticated;");
  });

  it("calls the app only with the Vault's address and secret, while browsers want pushes and no worker runs", () => {
    expect(migration).toContain("if public.worker_enabled() or not exists (select 1 from public.device_tokens) then");
    expect(migration).toContain("where s.name = 'due_order_sweep_url'");
    expect(migration).toContain("where s.name = 'due_order_sweep_secret'");
    expect(migration).toContain("'Authorization', 'Bearer ' || secret");
    expect(migration).toMatch(/security definer\s+set search_path = ''/);
  });

  it("asks every five minutes, and keeps a week of the scheduler's history", () => {
    expect(migration).toContain("select cron.schedule('due-order-sweep', '*/5 * * * *', 'select public.request_due_order_sweep()');");
    expect(migration).toContain("delete from cron.job_run_details where end_time < now() - interval '7 days'");
  });

  it("holds no address or secret of its own", () => {
    expect(migration).not.toMatch(/https?:\/\/[^\s']*\/api\/cron/);
    expect(migration).not.toMatch(/vault\.create_secret/);
  });
});
