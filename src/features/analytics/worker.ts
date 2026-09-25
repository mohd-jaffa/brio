import { JOB_TYPES } from "@/constants/jobs";
import { registerJobHandler } from "@/lib/jobs/queue";
import { type Job } from "@/lib/jobs/types";
import { logger } from "@/lib/logger";

export function registerAnalyticsWorker() {
  registerJobHandler(JOB_TYPES.refreshAnalytics, handleRefreshAnalytics);
  logger.info("AnalyticsWorker registered handlers");
}

async function handleRefreshAnalytics(job: Job): Promise<void> {
  const { bakeryId } = job.payload as { bakeryId?: string };
  
  if (!bakeryId) {
    throw new Error("Invalid analytics job payload: missing bakeryId");
  }

  logger.info("Running background analytics refresh", { bakeryId });
}
