import type { SupabaseClient } from "@supabase/supabase-js";

import { SWEEP_INTERVAL_MS, WORKER_IDLE_MS } from "@/constants/jobs";
import { logger } from "@/lib/logger";

import { processNextJob, recoverStaleJobs, runSweeps } from "./queue";

/** Resolves after `ms`, or at once when the worker is asked to stop. */
function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done, { once: true });
  });
}

/**
 * The worker's loop (plan §26): run the sweeps when they are due, hand back
 * jobs whose worker died, take the next due job and run it, and when there is
 * none, wait a moment and look again. It stops when `signal` is aborted —
 * after the job in hand, never in the middle of one. A failure to reach the
 * database is logged and waited out rather than ending the worker.
 */
export async function runWorker({
  client,
  workerId,
  signal,
  idleMs = WORKER_IDLE_MS,
  sweepMs = SWEEP_INTERVAL_MS,
}: {
  client: SupabaseClient;
  workerId: string;
  signal: AbortSignal;
  idleMs?: number;
  sweepMs?: number;
}): Promise<void> {
  logger.info("Worker started", { workerId });
  let swept = Number.NEGATIVE_INFINITY;
  while (!signal.aborted) {
    try {
      // First, so what a sweep queues is taken straight after it.
      if (Date.now() - swept >= sweepMs) {
        swept = Date.now();
        await runSweeps(client);
      }

      const recovered = await recoverStaleJobs(client);
      if (recovered > 0) logger.warn("Recovered jobs whose worker stopped responding", { workerId, recovered });

      if (await processNextJob(client, workerId)) continue;
    } catch (error) {
      logger.error("Worker could not reach the queue", { workerId, reason: error instanceof Error ? error.message : String(error) });
    }
    await pause(idleMs, signal);
  }
  logger.info("Worker stopped", { workerId });
}
