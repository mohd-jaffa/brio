import { hostname } from "node:os";

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
 */
export function registerWorkers() {
  registerNotificationWorker();
  registerAnalyticsWorker();
}

export async function main() {
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
