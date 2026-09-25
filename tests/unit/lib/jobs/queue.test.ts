import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Job } from "@/lib/jobs/types";

const logger = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger }));

import {
  claimNextJob,
  clearJobHandlers,
  createJob,
  markCompleted,
  markFailed,
  processNextJob,
  recoverStaleJobs,
  registerJobHandler,
} from "@/lib/jobs/queue";

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: "j-1",
    type: "REFRESH_ANALYTICS",
    payload: {},
    status: "processing",
    attempts: 1,
    run_at: "2026-09-25T10:00:00Z",
    locked_at: "2026-09-25T10:00:00Z",
    locked_by: "w-1",
    last_error: null,
    created_at: "2026-09-25T10:00:00Z",
    completed_at: null,
    ...overrides,
  };
}

/**
 * The queue's side of supabase-js: the two functions, and the update that
 * settles a job, which records what it changed and which worker it was for.
 */
function fakeClient({
  claimed = null as Job | null,
  held = true,
  recovered = 0,
  insertError = null as unknown,
  rpcError = null as unknown,
} = {}) {
  const rpc = vi.fn((name: string) => {
    const data = name === "claim_next_job" ? claimed : recovered;
    const result = { data: rpcError ? null : data, error: rpcError };
    return Object.assign(Promise.resolve(result), { maybeSingle: () => Promise.resolve(result) });
  });
  const updates: Array<{ changes: Record<string, unknown>; filters: unknown[][] }> = [];
  const inserts: unknown[] = [];
  const from = vi.fn(() => ({
    insert: (row: unknown) => {
      inserts.push(row);
      return Promise.resolve({ error: insertError });
    },
    update: (changes: Record<string, unknown>) => {
      const entry = { changes, filters: [] as unknown[][] };
      updates.push(entry);
      const chain = {
        eq: (...args: unknown[]) => (entry.filters.push(args), chain),
        select: () => chain,
        maybeSingle: () => Promise.resolve({ data: held ? { id: "j-1" } : null, error: null }),
      };
      return chain;
    },
  }));
  return { client: { rpc, from } as unknown as SupabaseClient, rpc, updates, inserts };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearJobHandlers();
});

describe("createJob", () => {
  it("puts the work on the queue, due now unless told otherwise", async () => {
    const { client, inserts } = fakeClient();
    await createJob(client, { type: "REFRESH_ANALYTICS", payload: { bakeryId: "b-1" } });
    expect(inserts[0]).toMatchObject({ type: "REFRESH_ANALYTICS", payload: { bakeryId: "b-1" }, run_at: expect.any(String) });
  });

  it("keeps the driver's error out of what a caller could be shown", async () => {
    const { client } = fakeClient({ insertError: { message: 'relation "jobs" does not exist' } });
    const failure = await createJob(client, { type: "X" }).catch((error: unknown) => error);
    expect(failure).toMatchObject({ code: "INTERNAL_ERROR", details: undefined });
  });
});

describe("claimNextJob and recoverStaleJobs", () => {
  it("takes the next job through the atomic claim, naming this worker", async () => {
    const { client, rpc } = fakeClient({ claimed: job() });
    await expect(claimNextJob(client, "w-1")).resolves.toMatchObject({ id: "j-1" });
    expect(rpc).toHaveBeenCalledWith("claim_next_job", { p_worker: "w-1" });
  });

  it("answers null when nothing is due", async () => {
    const { client } = fakeClient();
    await expect(claimNextJob(client, "w-1")).resolves.toBeNull();
  });

  it("hands back jobs held past the ten-minute lease, within three attempts", async () => {
    const { client, rpc } = fakeClient({ recovered: 2 });
    await expect(recoverStaleJobs(client)).resolves.toBe(2);
    expect(rpc).toHaveBeenCalledWith("recover_stale_jobs", { p_lease: "600 seconds", p_max_attempts: 3 });
  });

  it("reports a queue it cannot reach as internal", async () => {
    const { client } = fakeClient({ rpcError: { message: "connection refused" } });
    await expect(claimNextJob(client, "w-1")).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    await expect(recoverStaleJobs(client)).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  });
});

describe("settling a job", () => {
  it("completes a job only while this worker still holds it", async () => {
    const { client, updates } = fakeClient();
    await markCompleted(client, job(), "w-1");
    expect(updates[0].changes).toMatchObject({ status: "completed", locked_by: null, locked_at: null });
    expect(updates[0].filters).toEqual([["id", "j-1"], ["locked_by", "w-1"]]);
  });

  it("leaves alone a job whose lease ran out and says so", async () => {
    const { client } = fakeClient({ held: false });
    await markCompleted(client, job(), "w-1");
    expect(logger.warn).toHaveBeenCalledWith("Job was no longer held when it finished", { jobId: "j-1", type: "REFRESH_ANALYTICS" });
  });

  it("puts a failed job back to wait five minutes while it has attempts left", async () => {
    const { client, updates } = fakeClient();
    const before = Date.now();
    await markFailed(client, job({ attempts: 2 }), "w-1", "SMTP refused");

    const { changes } = updates[0];
    expect(changes).toMatchObject({ status: "pending", last_error: "SMTP refused" });
    const wait = new Date(changes.run_at as string).getTime() - before;
    expect(wait).toBeGreaterThanOrEqual(5 * 60_000 - 50);
    expect(wait).toBeLessThan(5 * 60_000 + 1_000);
  });

  it("sets a job aside as failed, and visible, once its attempts are used up", async () => {
    const { client, updates } = fakeClient();
    await markFailed(client, job({ attempts: 3 }), "w-1", "x".repeat(5_000));
    expect(updates[0].changes).toMatchObject({ status: "failed" });
    expect(updates[0].changes).not.toHaveProperty("run_at");
    expect((updates[0].changes.last_error as string).length).toBe(1_000);
  });
});

describe("processNextJob", () => {
  it("says there was nothing to do when no job is due", async () => {
    const { client } = fakeClient();
    await expect(processNextJob(client, "w-1")).resolves.toBe(false);
  });

  it("runs the job's handler and completes it", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    registerJobHandler("REFRESH_ANALYTICS", handler);
    const { client, updates } = fakeClient({ claimed: job() });

    await expect(processNextJob(client, "w-1")).resolves.toBe(true);
    expect(handler).toHaveBeenCalledWith(job());
    expect(updates[0].changes.status).toBe("completed");
  });

  it("fails the attempt, not the worker, when the handler throws", async () => {
    registerJobHandler("REFRESH_ANALYTICS", vi.fn().mockRejectedValue(new Error("provider down")));
    const { client, updates } = fakeClient({ claimed: job() });

    await expect(processNextJob(client, "w-1")).resolves.toBe(true);
    expect(updates[0].changes).toMatchObject({ status: "pending", last_error: "provider down" });
    expect(logger.error).toHaveBeenCalledWith("Job failed", { jobId: "j-1", type: "REFRESH_ANALYTICS", attempt: 1, reason: "provider down" });
  });

  it("fails a job nobody handles, with a reason that says so", async () => {
    const { client, updates } = fakeClient({ claimed: job({ type: "UNKNOWN" }) });
    await processNextJob(client, "w-1");
    expect(updates[0].changes.last_error).toBe("No handler is registered for UNKNOWN");
  });

  it("records a thrown value that is not an Error as text", async () => {
    registerJobHandler("REFRESH_ANALYTICS", () => Promise.reject("plain words"));
    const { client, updates } = fakeClient({ claimed: job() });
    await processNextJob(client, "w-1");
    expect(updates[0].changes.last_error).toBe("plain words");
  });
});
