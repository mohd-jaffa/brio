import { beforeEach, describe, expect, it, vi } from "vitest";

const { registerNotificationWorker, registerAnalyticsWorker, registerCleanupWorker, runWorker, client, logger, mode } =
  vi.hoisted(() => ({
    registerNotificationWorker: vi.fn(),
    registerAnalyticsWorker: vi.fn(),
    registerCleanupWorker: vi.fn(),
    runWorker: vi.fn(),
    client: { service: true },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    // Whether a worker runs (WORKER_ENABLED): none for now, and each path is kept.
    mode: { worker: true },
  }));
vi.mock("@/constants/jobs", async (original) => ({
  ...(await original<typeof import("@/constants/jobs")>()),
  get WORKER_ENABLED() {
    return mode.worker;
  },
}));
vi.mock("@/features/notifications/worker", () => ({ registerNotificationWorker }));
vi.mock("@/features/analytics/worker", () => ({ registerAnalyticsWorker }));
vi.mock("@/lib/jobs/cleanup", () => ({ registerCleanupWorker }));
vi.mock("@/lib/jobs/runner", () => ({ runWorker }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServiceRoleClient: () => client }));
vi.mock("@/lib/logger", () => ({ logger }));

import { main, registerWorkers } from "@/worker";

beforeEach(() => {
  vi.clearAllMocks();
  mode.worker = true;
  process.exitCode = undefined;
});

describe("the worker process", () => {
  it("registers every worker's handlers, so no queued job goes unhandled (§133.6 F2)", () => {
    registerWorkers();
    expect(registerNotificationWorker).toHaveBeenCalledOnce();
    expect(registerAnalyticsWorker).toHaveBeenCalledOnce();
    expect(registerCleanupWorker).toHaveBeenCalledOnce();
  });

  it("runs the queue as the service role, named for its host and process, until SIGTERM", async () => {
    let stopSignal: AbortSignal | undefined;
    runWorker.mockImplementation(async ({ signal }: { signal: AbortSignal }) => {
      stopSignal = signal;
    });

    await main();

    expect(runWorker).toHaveBeenCalledWith(
      expect.objectContaining({ client, workerId: expect.stringMatching(new RegExp(`-${process.pid}$`)) }),
    );
    expect(stopSignal?.aborted).toBe(false);
    process.emit("SIGTERM");
    expect(stopSignal?.aborted).toBe(true);
  });

  it("does not start while the app does the work itself, and says why", async () => {
    mode.worker = false;
    await main();

    expect(runWorker).not.toHaveBeenCalled();
    expect(registerNotificationWorker).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("WORKER_ENABLED is false"));
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
  });
});
