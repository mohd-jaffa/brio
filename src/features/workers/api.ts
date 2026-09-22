import { type SupabaseClient } from "@supabase/supabase-js";
import { type CreateJobDTO, type Job } from "./types";
import { InternalServerError } from "@/shared/errors/app-error";
import { logger } from "@/shared/logging/logger";

export async function createJob(client: SupabaseClient, payload: CreateJobDTO): Promise<Job> {
  const { data, error } = await client
    .from("jobs")
    .insert({
      type: payload.type,
      payload: payload.payload ?? {},
      run_at: payload.run_at ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new InternalServerError("INTERNAL_ERROR", error);
  }

  return data;
}

export async function claimNextJob(client: SupabaseClient, workerId: string): Promise<Job | null> {
  const { data, error } = await client
    .from("jobs")
    .update({ 
      status: "processing", 
      locked_at: new Date().toISOString(), 
      locked_by: workerId,
      attempts: 1
    })
    .eq("status", "pending")
    .lte("run_at", new Date().toISOString())
    .select()
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new InternalServerError("INTERNAL_ERROR", error);
  }

  return data;
}

export async function markCompleted(client: SupabaseClient, jobId: string): Promise<void> {
  const { error } = await client
    .from("jobs")
    .update({ 
      status: "completed", 
      completed_at: new Date().toISOString(),
      locked_by: null
    })
    .eq("id", jobId);

  if (error) {
    throw new InternalServerError("INTERNAL_ERROR", error);
  }
}

export async function markFailed(client: SupabaseClient, jobId: string, errorMessage: string, deadLetter: boolean = false): Promise<void> {
  const { error } = await client
    .from("jobs")
    .update({ 
      status: deadLetter ? "failed" : "pending", // if not dead letter, it goes back to pending for retry
      last_error: errorMessage,
      locked_by: null,
      locked_at: null,
      // If retrying, delay the next run by 5 minutes. In a real system, use exponential backoff.
      run_at: deadLetter ? undefined : new Date(Date.now() + 5 * 60000).toISOString()
    })
    .eq("id", jobId);

  if (error) {
    throw new InternalServerError("INTERNAL_ERROR", error);
  }
}

export type JobHandler = (job: Job) => Promise<void>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(type: string, handler: JobHandler) {
  handlers.set(type, handler);
}

export async function processNextJob(client: SupabaseClient, workerId: string = "default-worker"): Promise<boolean> {
  const job = await claimNextJob(client, workerId);
  
  if (!job) {
    return false; // No jobs available
  }

  try {
    const handler = handlers.get(job.type);
    if (!handler) {
      throw new Error(`No handler registered for job type: \${job.type}`);
    }

    await handler(job);
    await markCompleted(client, job.id);
    return true;
  } catch (error) {
    logger.error("Job execution failed", { jobId: job.id, type: job.type, error: String(error) });
    
    const maxAttempts = 3;
    if (job.attempts < maxAttempts) {
      await markFailed(client, job.id, String(error), false);
    } else {
      await markFailed(client, job.id, String(error), true);
    }
    return true; 
  }
}
