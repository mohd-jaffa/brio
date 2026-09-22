import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import { AnalyticsWorker } from "@/features/analytics/worker";
import { WorkerService } from "@/features/workers/service";
import { type Job } from "@/features/workers/types";

vi.mock("@/features/workers/service");

describe("AnalyticsWorker", () => {
  let workerService: Mocked<WorkerService>;
  let analyticsWorker: AnalyticsWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    workerService = new WorkerService({} as any) as any;
    analyticsWorker = new AnalyticsWorker(workerService);
  });

  it("should register REFRESH_ANALYTICS handler", () => {
    analyticsWorker.register();
    expect(workerService.registerHandler).toHaveBeenCalledWith(
      "REFRESH_ANALYTICS",
      expect.any(Function)
    );
  });

  it("should process analytics job successfully", async () => {
    analyticsWorker.register();
    const handler = vi.mocked(workerService.registerHandler).mock.calls[0][1];

    const job: Job = {
      id: "job-1",
      type: "REFRESH_ANALYTICS",
      payload: { bakeryId: "bakery-123" },
      status: "processing",
      attempts: 1,
      run_at: new Date().toISOString(),
      locked_at: new Date().toISOString(),
      locked_by: "worker",
      last_error: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    };

    await expect(handler(job)).resolves.not.toThrow();
  });

  it("should throw error if payload is missing bakeryId", async () => {
    analyticsWorker.register();
    const handler = vi.mocked(workerService.registerHandler).mock.calls[0][1];

    const job: Job = {
      id: "job-2",
      type: "REFRESH_ANALYTICS",
      payload: {}, // missing bakeryId
      status: "processing",
      attempts: 1,
      run_at: new Date().toISOString(),
      locked_at: new Date().toISOString(),
      locked_by: "worker",
      last_error: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    };

    await expect(handler(job)).rejects.toThrow("Invalid analytics job payload: missing bakeryId");
  });
});
