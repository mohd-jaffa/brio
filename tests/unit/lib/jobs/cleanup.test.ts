import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const logger = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger }));

import { cleanUpQueue, registerCleanupWorker } from "@/lib/jobs/cleanup";
import { clearSweeps, runSweeps } from "@/lib/jobs/queue";

function fakeClient(result: { data: unknown; error: unknown } = { data: 3, error: null }) {
  const rpc = vi.fn(async () => result);
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearSweeps();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-29T03:41:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("cleanUpQueue", () => {
  it("asks the database to drop the finished jobs it no longer needs, and says how many went", async () => {
    const { client, rpc } = fakeClient();
    await expect(cleanUpQueue(client)).resolves.toBe(3);
    expect(rpc).toHaveBeenCalledWith("clean_up_queue");
    await expect(cleanUpQueue(fakeClient({ data: null, error: null }).client)).resolves.toBe(0);
  });

  it("keeps the driver's error out of what could be shown", async () => {
    const failure = await cleanUpQueue(
      fakeClient({ data: null, error: { message: "permission denied" } }).client,
    ).catch((error: unknown) => error);
    expect(failure).toMatchObject({ code: "INTERNAL_ERROR", details: undefined });
  });
});

describe("registerCleanupWorker", () => {
  it("cleans the queue from the worker's sweeps once a day, not every sweep", async () => {
    registerCleanupWorker();
    const { client, rpc } = fakeClient();

    await runSweeps(client);
    expect(rpc).toHaveBeenCalledOnce();
    expect(logger.info).toHaveBeenCalledWith("Cleaned the job queue", { removed: 3 });

    vi.advanceTimersByTime(23 * 60 * 60_000);
    await runSweeps(client);
    expect(rpc).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(60 * 60_000);
    await runSweeps(client);
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("says nothing when there was nothing to clean", async () => {
    registerCleanupWorker();
    await runSweeps(fakeClient({ data: 0, error: null }).client);
    expect(logger.info).not.toHaveBeenCalled();
  });
});
