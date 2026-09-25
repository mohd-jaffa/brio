/**
 * The job queue's states, names and timings (AGENTS.md §17, plan §26). The
 * database checks the states too (0012_job_claiming.sql).
 */
export const JOB_STATUSES = ["pending", "processing", "completed", "failed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** Every kind of work the queue carries, and the handler registered for it. */
export const JOB_TYPES = {
  accountConfirmation: "SEND_ACCOUNT_CONFIRMATION",
  pushNotification: "SEND_PUSH_NOTIFICATION",
  refreshAnalytics: "REFRESH_ANALYTICS",
} as const;
export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

/** Tries before a job is set aside as failed, where it stays visible (the dead-letter state). */
export const MAX_JOB_ATTEMPTS = 3;

/** How long a worker may hold a job before it is taken to have died with it. */
export const JOB_LEASE_MS = 10 * 60_000;

/** How long a failed job waits before it is tried again. Fixed for now; exponential with R6.1. */
export const JOB_RETRY_DELAY_MS = 5 * 60_000;

/** How long an idle worker waits before looking again. */
export const WORKER_IDLE_MS = 5_000;
