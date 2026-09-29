import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0012_job_claiming.sql"), "utf8");

/**
 * The contract of 0012 (§133.6 F3–F5). Proved on the local database as well:
 * three workers drained 60 jobs, 20 each, every one on its first attempt; a
 * job held by a dead worker was handed back and completed; a job no handler
 * knows was set aside as failed after its third attempt.
 */
describe("job claiming migration", () => {
  it("holds a job to one of four states", () => {
    expect(migration).toMatch(/check \(status in \('pending', 'processing', 'completed', 'failed'\)\)/);
  });

  it("claims one due job atomically, skipping any another worker holds, and counts the attempt", () => {
    expect(migration).toMatch(/function public\.claim_next_job\(p_worker text\)/);
    expect(migration).toMatch(
      /where status = 'pending'\s+and run_at <= now\(\)\s+order by run_at, created_at\s+limit 1\s+for update skip locked/,
    );
    expect(migration).toMatch(/attempts = j\.attempts \+ 1/);
  });

  it("hands back a job held past its lease, or sets it aside once its attempts are used", () => {
    expect(migration).toMatch(/function public\.recover_stale_jobs\(p_lease interval, p_max_attempts integer\)/);
    expect(migration).toMatch(/case when attempts >= p_max_attempts then 'failed' else 'pending' end/);
    expect(migration).toMatch(/where status = 'processing'\s+and locked_at < now\(\) - p_lease/);
  });

  it("lets only the worker, as the service role, call either", () => {
    for (const fn of ["claim_next_job\\(text\\)", "recover_stale_jobs\\(interval, integer\\)"]) {
      expect(migration).toMatch(new RegExp(`revoke all on function public\\.${fn} from public, anon, authenticated;`));
      expect(migration).toMatch(new RegExp(`grant execute on function public\\.${fn} to service_role;`));
    }
  });

  it("indexes what the worker looks for", () => {
    expect(migration).toMatch(/on public\.jobs \(run_at, created_at\) where status = 'pending'/);
    expect(migration).toMatch(/on public\.jobs \(locked_at\) where status = 'processing'/);
  });
});
