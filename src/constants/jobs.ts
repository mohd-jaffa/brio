/**
 * The job queue's states, names and timings (AGENTS.md §17, plan §26). The
 * database checks the states too (0012_job_claiming.sql).
 */
export const JOB_STATUSES = ["pending", "processing", "completed", "failed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/**
 * Whether a worker process runs beside the app (`npm run worker`). For now
 * none does (the user, 2026-09-27: "iam not able to host workers now"), so
 * the app does the work itself:
 *
 * - **Email** — the confirmation at registration and its Resend, and a new
 *   email's link — is sent by the request that asks for it.
 * - **Notifications** are only for orders due soon and overdue, which the app
 *   looks for as the bell is read (`checkDueOrders`). The others — an order
 *   placed or moved, a payment, a customer added, stock running low — are not
 *   made at all: the database holds them back at the queue while
 *   `public.worker_enabled()` is false (0027), which a test keeps equal to this.
 *
 * Every worker, handler and trigger stays in place. Running a worker again is
 * this set to true, a migration setting `worker_enabled()` to true, and
 * `npm run worker` beside the app.
 */
export const WORKER_ENABLED = false;

/** Every kind of work the queue carries, and the handler registered for it. */
export const JOB_TYPES = {
  accountConfirmation: "SEND_ACCOUNT_CONFIRMATION",
  emailChangeConfirmation: "SEND_EMAIL_CHANGE_CONFIRMATION",
  pushNotification: "SEND_PUSH_NOTIFICATION",
  refreshAnalytics: "REFRESH_ANALYTICS",
} as const;
export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

/** Tries before a job is set aside as failed, where it stays visible (the dead-letter state). */
export const MAX_JOB_ATTEMPTS = 5;

/** How long a worker may hold a job before it is taken to have died with it. */
export const JOB_LEASE_MS = 10 * 60_000;

/**
 * How long a failed job waits before it is tried again: a minute after the
 * first failure, doubling with each after it — 1, 2, 4, 8 minutes — and never
 * more than an hour (§133.6 F6).
 */
export const JOB_RETRY_BASE_MS = 60_000;
export const JOB_RETRY_MAX_MS = 60 * 60_000;

/**
 * How long a finished job is kept before the CleanupWorker drops it (§133.6
 * F7): a completed one, from when it completed; a failed one — kept longer,
 * so a failure can still be looked into — from when it was queued. The same
 * as `clean_up_queue()` (0032_queue_hardening.sql); a test keeps them equal.
 */
export const JOB_KEEP_COMPLETED_DAYS = 30;
export const JOB_KEEP_FAILED_DAYS = 90;

/** How often a worker cleans the queue. */
export const QUEUE_CLEANUP_INTERVAL_MS = 24 * 60 * 60_000;

/** How long an idle worker waits before looking again. */
export const WORKER_IDLE_MS = 5_000;

/** How often a worker runs its sweeps — the look for orders due soon or overdue. */
export const SWEEP_INTERVAL_MS = 60_000;
