import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import { WorkerService } from "@/features/workers/service";
import { JobsRepository } from "@/features/workers/repository";
import { type Job } from "@/features/workers/types";

vi.mock("@/features/workers/repository");

describe("WorkerService", () => {
  let service: WorkerService;
  let mockJobsRepo: Mocked<JobsRepository>;

  const mockClient = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorkerService(mockClient);
    mockJobsRepo = vi.mocked(JobsRepository).prototype as Mocked<JobsRepository>;
  });

  describe("processNextJob", () => {
    it("should return false if no jobs are available", async () => {
      mockJobsRepo.claimNextJob.mockResolvedValue(null);

      const result = await service.processNextJob("worker-1");

      expect(result).toBe(false);
      expect(mockJobsRepo.claimNextJob).toHaveBeenCalledWith("worker-1");
    });

    it("should process a job successfully and mark it completed", async () => {
      const mockJob: Job = {
        id: "job-1",
        type: "SEND_EMAIL",
        payload: { to: "test@example.com" },
        status: "processing",
        attempts: 1,
        run_at: new Date().toISOString(),
        locked_at: new Date().toISOString(),
        locked_by: "worker-1",
        last_error: null,
        created_at: new Date().toISOString(),
        completed_at: null,
      };

      mockJobsRepo.claimNextJob.mockResolvedValue(mockJob);

      const handler = vi.fn().mockResolvedValue(undefined);
      service.registerHandler("SEND_EMAIL", handler);

      const result = await service.processNextJob("worker-1");

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith(mockJob);
      expect(mockJobsRepo.markCompleted).toHaveBeenCalledWith("job-1");
    });

    it("should mark job as failed on error", async () => {
      const mockJob: Job = {
        id: "job-2",
        type: "SEND_EMAIL",
        payload: { to: "test@example.com" },
        status: "processing",
        attempts: 1,
        run_at: new Date().toISOString(),
        locked_at: new Date().toISOString(),
        locked_by: "worker-1",
        last_error: null,
        created_at: new Date().toISOString(),
        completed_at: null,
      };

      mockJobsRepo.claimNextJob.mockResolvedValue(mockJob);

      const handler = vi.fn().mockRejectedValue(new Error("SMTP Error"));
      service.registerHandler("SEND_EMAIL", handler);

      const result = await service.processNextJob("worker-1");

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith(mockJob);
      expect(mockJobsRepo.markFailed).toHaveBeenCalledWith("job-2", "Error: SMTP Error", false);
    });

    it("should mark job as dead letter if max attempts reached", async () => {
      const mockJob: Job = {
        id: "job-3",
        type: "SEND_EMAIL",
        payload: { to: "test@example.com" },
        status: "processing",
        attempts: 3, // Max attempts
        run_at: new Date().toISOString(),
        locked_at: new Date().toISOString(),
        locked_by: "worker-1",
        last_error: null,
        created_at: new Date().toISOString(),
        completed_at: null,
      };

      mockJobsRepo.claimNextJob.mockResolvedValue(mockJob);

      const handler = vi.fn().mockRejectedValue(new Error("SMTP Error Persistent"));
      service.registerHandler("SEND_EMAIL", handler);

      const result = await service.processNextJob("worker-1");

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith(mockJob);
      expect(mockJobsRepo.markFailed).toHaveBeenCalledWith("job-3", "Error: SMTP Error Persistent", true);
    });
  });
});
