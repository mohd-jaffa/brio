import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const logger = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger }));
const queue = vi.hoisted(() => ({ processNextJob: vi.fn(), recoverStaleJobs: vi.fn() }));
vi.mock("@/lib/jobs/queue", () => queue);

import { runWorker } from "@/lib/jobs/runner";

const client = {} as SupabaseClient;

beforeEach(() => {
  vi.clearAllMocks();
  queue.recoverStaleJobs.mockResolvedValue(0);
});

describe("runWorker", () => {
  it("keeps taking jobs while there are any, then waits, and stops when asked", async () => {
    const stop = new AbortController();
    let taken = 0;
    queue.processNextJob.mockImplementation(async () => {
      taken += 1;
      if (taken === 4) stop.abort(); // asked to stop while idle-checking the fourth time
      return taken <= 3;
    });

    await runWorker({ client, workerId: "w-1", signal: stop.signal, idleMs: 60_000 });

    expect(queue.processNextJob).toHaveBeenCalledTimes(4);
    expect(queue.processNextJob).toHaveBeenCalledWith(client, "w-1");
    expect(logger.info).toHaveBeenCalledWith("Worker stopped", { workerId: "w-1" });
  });

  it("hands back abandoned jobs before taking one, and says how many", async () => {
    const stop = new AbortController();
    queue.recoverStaleJobs.mockResolvedValueOnce(2);
    queue.processNextJob.mockImplementation(async () => (stop.abort(), false));

    await runWorker({ client, workerId: "w-1", signal: stop.signal });

    expect(queue.recoverStaleJobs.mock.invocationCallOrder[0]).toBeLessThan(queue.processNextJob.mock.invocationCallOrder[0]);
    expect(logger.warn).toHaveBeenCalledWith("Recovered jobs whose worker stopped responding", { workerId: "w-1", recovered: 2 });
  });

  it("waits out a queue it cannot reach instead of ending", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const stop = new AbortController();
      queue.processNextJob.mockRejectedValueOnce(new Error("connection refused")).mockImplementation(async () => (stop.abort(), false));

      const running = runWorker({ client, workerId: "w-1", signal: stop.signal, idleMs: 1_000 });
      await vi.advanceTimersByTimeAsync(1_000);
      await running;

      expect(logger.error).toHaveBeenCalledWith("Worker could not reach the queue", { workerId: "w-1", reason: "connection refused" });
      expect(queue.processNextJob).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not start when it is already told to stop", async () => {
    const stop = new AbortController();
    stop.abort();
    await runWorker({ client, workerId: "w-1", signal: stop.signal });
    expect(queue.processNextJob).not.toHaveBeenCalled();
  });

  it("logs a reason that is not an Error as text", async () => {
    const stop = new AbortController();
    queue.recoverStaleJobs.mockRejectedValueOnce("down");
    queue.processNextJob.mockImplementation(async () => (stop.abort(), false));
    const running = runWorker({ client, workerId: "w-1", signal: stop.signal, idleMs: 0 });
    await running;
    expect(logger.error).toHaveBeenCalledWith("Worker could not reach the queue", { workerId: "w-1", reason: "down" });
  });
});
