import { hostname } from "node:os";

import { WORKER_ENABLED } from "@/constants/jobs";
import { registerAnalyticsWorker } from "@/features/analytics/worker";
import { registerNotificationWorker } from "@/features/notifications/worker";
import { runWorker } from "@/lib/jobs/runner";
import { logger } from "@/lib/logger";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

/**
 * The worker process (plan §26, §27; §133.6 F1, F2): `npm run worker`. It runs
 * beside the app, not inside it, and drains the job queue until it is told to
 * stop. Every worker registers its handlers here, so a job enqueued anywhere
 * has something to run it. Several may run at once; claiming is atomic.
 *
 * SIGINT and SIGTERM stop it after the job in hand, so a deploy never cuts a
 * job off half done.
 *
 * It does not start while WORKER_ENABLED is false (the user, 2026-09-27): the
 * app then sends mail and tells of due orders itself, and a sweep here would
 * mark orders as told while the database holds back what it queued.
 */
export function registerWorkers() {
  registerNotificationWorker();
  registerAnalyticsWorker();
}

export async function main() {
  if (!WORKER_ENABLED) {
    logger.warn("Worker not started: WORKER_ENABLED is false, and the app does this work itself");
    process.exitCode = 1;
    return;
  }
  registerWorkers();
  const stop = new AbortController();
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      logger.info("Worker stopping after the job in hand", { signal });
      stop.abort();
    });
  }

  await runWorker({
    client: createSupabaseServiceRoleClient(),
    workerId: `${hostname()}-${process.pid}`,
    signal: stop.signal,
  });
}

if (process.argv[1]?.endsWith("worker.ts")) {
  main().catch((error) => {
    logger.error("Worker could not start", { reason: error instanceof Error ? error.message : String(error) });
    process.exitCode = 1;
  });
}
