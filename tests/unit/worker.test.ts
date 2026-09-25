import { beforeEach, describe, expect, it, vi } from "vitest";

const { registerNotificationWorker, registerAnalyticsWorker, runWorker, client } = vi.hoisted(() => ({
  registerNotificationWorker: vi.fn(),
  registerAnalyticsWorker: vi.fn(),
  runWorker: vi.fn(),
  client: { service: true },
}));
vi.mock("@/features/notifications/worker", () => ({ registerNotificationWorker }));
vi.mock("@/features/analytics/worker", () => ({ registerAnalyticsWorker }));
vi.mock("@/lib/jobs/runner", () => ({ runWorker }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServiceRoleClient: () => client }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { main, registerWorkers } from "@/worker";

beforeEach(() => vi.clearAllMocks());

describe("the worker process", () => {
  it("registers every worker's handlers, so no queued job goes unhandled (§133.6 F2)", () => {
    registerWorkers();
    expect(registerNotificationWorker).toHaveBeenCalledOnce();
    expect(registerAnalyticsWorker).toHaveBeenCalledOnce();
  });

  it("runs the queue as the service role, named for its host and process, until SIGTERM", async () => {
    let stopSignal: AbortSignal | undefined;
    runWorker.mockImplementation(async ({ signal }: { signal: AbortSignal }) => {
      stopSignal = signal;
    });

    await main();

    expect(runWorker).toHaveBeenCalledWith(expect.objectContaining({ client, workerId: expect.stringMatching(new RegExp(`-${process.pid}$`)) }));
    expect(stopSignal?.aborted).toBe(false);
    process.emit("SIGTERM");
    expect(stopSignal?.aborted).toBe(true);
  });
});
