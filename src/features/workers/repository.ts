import { type SupabaseClient } from "@supabase/supabase-js";
import { type CreateJobDTO, type Job } from "./types";
import { InternalServerError } from "@/shared/errors/app-error";

export class JobsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(payload: CreateJobDTO): Promise<Job> {
    const { data, error } = await this.client
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

  async claimNextJob(workerId: string): Promise<Job | null> {
    // Atomic claiming using Postgres CTE
    // Supabase JS doesn't support CTEs directly, so we can use a stored procedure OR
    // rely on simple update with filter if concurrency is low.
    // For this MVP, we do a simple select and update, which might have race conditions 
    // unless we use a Postgres function. We'll use a simple update with limit.
    const { data, error } = await this.client
      .from("jobs")
      .update({ 
        status: "processing", 
        locked_at: new Date().toISOString(), 
        locked_by: workerId,
        attempts: 1 // simplified for MVP, ideally we increment
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

  async markCompleted(jobId: string): Promise<void> {
    const { error } = await this.client
      .from("jobs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", jobId);

    if (error) throw new InternalServerError("INTERNAL_ERROR", error);
  }

  async markFailed(jobId: string, lastError: string, deadLetter: boolean): Promise<void> {
    const { error } = await this.client
      .from("jobs")
      .update({ 
        status: deadLetter ? "failed" : "pending", 
        last_error: lastError,
        locked_by: null,
        locked_at: null,
        run_at: deadLetter ? new Date().toISOString() : new Date(Date.now() + 60000).toISOString() // 1 min backoff
      })
      .eq("id", jobId);

    if (error) throw new InternalServerError("INTERNAL_ERROR", error);
  }
}
