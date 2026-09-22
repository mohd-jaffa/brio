import { type SupabaseClient } from "@supabase/supabase-js";
import { JobsRepository } from "./repository";
import { type Job } from "./types";
import { logger } from "@/shared/logging/logger";

export interface JobHandler {
  (job: Job): Promise<void>;
}

export class WorkerService {
  private readonly repository: JobsRepository;
  private readonly handlers = new Map<string, JobHandler>();

  constructor(client: SupabaseClient) {
    this.repository = new JobsRepository(client);
  }

  registerHandler(type: string, handler: JobHandler) {
    this.handlers.set(type, handler);
  }

  async processNextJob(workerId: string = "default-worker"): Promise<boolean> {
    // 1. Claim a pending job
    const job = await this.repository.claimNextJob(workerId);
    
    if (!job) {
      return false; // No jobs available
    }

    try {
      const handler = this.handlers.get(job.type);
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`);
      }

      // 2. Execute job
      await handler(job);

      // 3. Mark completed
      await this.repository.markCompleted(job.id);
      return true;
    } catch (error) {
      logger.error("Job execution failed", { jobId: job.id, type: job.type, error: String(error) });
      
      // 4. Mark failed or retry
      const maxAttempts = 3;
      if (job.attempts < maxAttempts) {
        await this.repository.markFailed(job.id, String(error), false);
      } else {
        await this.repository.markFailed(job.id, String(error), true);
      }
      return true;
    }
  }
}
