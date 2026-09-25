import { type SupabaseClient } from "@supabase/supabase-js";

import { JOB_LEASE_MS, JOB_RETRY_DELAY_MS, MAX_JOB_ATTEMPTS } from "@/constants/jobs";
import { internalError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { type CreateJobDTO, type Job } from "./types";

/**
 * The PostgreSQL job queue (AGENTS.md §17, plan §26). Work is put on it while
 * a request is served, and a separate worker process takes it off
 * (src/worker.ts). The worker's calls run as the service role: a job carries
 * no bakery_id, so nobody else may read one.
 */

/**
 * Puts work on the queue. The row is deliberately not read back: a signed-in
 * user may insert a job and nothing else — and no caller wants the row
 * anyway, they want the work to happen later.
 */
export async function createJob(client: SupabaseClient, payload: CreateJobDTO): Promise<void> {
  const { error } = await client.from("jobs").insert({
    type: payload.type,
    payload: payload.payload ?? {},
    run_at: payload.run_at ?? new Date().toISOString(),
  });

  // The driver's error is the cause, which is logged, never the details, which
  // reach the response (AGENTS.md §10).
  if (error) throw internalError("INTERNAL_ERROR", undefined, error);
}

/**
 * Takes the next due job for this worker, or null when none is due. Atomic in
 * the database (`claim_next_job`, FOR UPDATE SKIP LOCKED): two workers never
 * take the same job, and the attempt is counted as it is taken (§133.6 F3, F4).
 */
export async function claimNextJob(client: SupabaseClient, workerId: string): Promise<Job | null> {
  const { data, error } = await client.rpc("claim_next_job", { p_worker: workerId }).maybeSingle();
  if (error) throw internalError("INTERNAL_ERROR", undefined, error);
  return (data as Job | null) ?? null;
}

/**
 * Hands back every job held past its lease — its worker died with it — or sets
 * it aside as failed when its attempts are used up (§133.6 F5). Returns how
 * many were recovered.
 */
export async function recoverStaleJobs(client: SupabaseClient): Promise<number> {
  const { data, error } = await client.rpc("recover_stale_jobs", {
    p_lease: `${JOB_LEASE_MS / 1000} seconds`,
    p_max_attempts: MAX_JOB_ATTEMPTS,
  });
  if (error) throw internalError("INTERNAL_ERROR", undefined, error);
  return Number(data ?? 0);
}

/**
 * Settles a job this worker holds. Only while it still holds it: a job whose
 * lease ran out may already be someone else's, and must not be overwritten.
 */
async function settle(client: SupabaseClient, job: Job, workerId: string, changes: Record<string, unknown>) {
  const { data, error } = await client
    .from("jobs")
    .update({ ...changes, locked_at: null, locked_by: null })
    .eq("id", job.id)
    .eq("locked_by", workerId)
    .select("id")
    .maybeSingle();

  if (error) throw internalError("INTERNAL_ERROR", undefined, error);
  if (!data) logger.warn("Job was no longer held when it finished", { jobId: job.id, type: job.type });
}

export function markCompleted(client: SupabaseClient, job: Job, workerId: string): Promise<void> {
  return settle(client, job, workerId, { status: "completed", completed_at: new Date().toISOString() });
}

/**
 * A failed attempt. With attempts left the job waits and goes back on the
 * queue; without, it is set aside as failed, with the reason, where it stays
 * visible rather than being retried for ever (§133.6 F4).
 */
export function markFailed(client: SupabaseClient, job: Job, workerId: string, reason: string): Promise<void> {
  const lastError = reason.slice(0, 1000);
  if (job.attempts >= MAX_JOB_ATTEMPTS) {
    return settle(client, job, workerId, { status: "failed", last_error: lastError });
  }
  return settle(client, job, workerId, {
    status: "pending",
    last_error: lastError,
    run_at: new Date(Date.now() + JOB_RETRY_DELAY_MS).toISOString(),
  });
}

export type JobHandler = (job: Job) => Promise<void>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(type: string, handler: JobHandler) {
  handlers.set(type, handler);
}

/** Only for tests: forgets every registered handler. */
export function clearJobHandlers() {
  handlers.clear();
}

/**
 * Takes one job and runs it. Returns whether there was one, so a worker knows
 * to look again at once or to wait. A handler that throws fails that attempt;
 * nothing a handler does can stop the worker.
 */
export async function processNextJob(client: SupabaseClient, workerId: string): Promise<boolean> {
  const job = await claimNextJob(client, workerId);
  if (!job) return false;

  const handler = handlers.get(job.type);
  try {
    if (!handler) throw new Error(`No handler is registered for ${job.type}`);
    await handler(job);
    await markCompleted(client, job, workerId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error("Job failed", { jobId: job.id, type: job.type, attempt: job.attempts, reason });
    await markFailed(client, job, workerId, reason);
  }
  return true;
}
