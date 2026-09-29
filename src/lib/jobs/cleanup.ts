import type { SupabaseClient } from "@supabase/supabase-js";

import { QUEUE_CLEANUP_INTERVAL_MS } from "@/constants/jobs";
import { internalError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { registerSweep } from "./queue";

/**
 * Drops finished jobs the queue no longer needs (`clean_up_queue`, 0032): a
 * completed one after JOB_KEEP_COMPLETED_DAYS, a failed one after
 * JOB_KEEP_FAILED_DAYS. Returns how many went.
 */
export async function cleanUpQueue(client: SupabaseClient): Promise<number> {
  const { data, error } = await client.rpc("clean_up_queue");
  if (error) throw internalError("INTERNAL_ERROR", undefined, error);
  return Number(data ?? 0);
}

/**
 * The CleanupWorker (plan §27, §133.6 F7): cleans the queue once a day, from
 * the worker's sweeps. While no worker runs, the database's scheduler does
 * the same (0032).
 */
export function registerCleanupWorker() {
  let cleaned = Number.NEGATIVE_INFINITY;
  registerSweep("queue cleanup", async (client) => {
    if (Date.now() - cleaned < QUEUE_CLEANUP_INTERVAL_MS) return;
    cleaned = Date.now();
    const removed = await cleanUpQueue(client);
    if (removed > 0) logger.info("Cleaned the job queue", { removed });
  });
}
