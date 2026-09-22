import { registerJobHandler } from "../workers/api";
import { type Job } from "../workers/types";
import { logger } from "@/shared/logging/logger";

export function registerAnalyticsWorker() {
  registerJobHandler("REFRESH_ANALYTICS", handleRefreshAnalytics);
  logger.info("AnalyticsWorker registered handlers");
}

async function handleRefreshAnalytics(job: Job): Promise<void> {
  const { bakeryId } = job.payload as { bakeryId?: string };
  
  if (!bakeryId) {
    throw new Error("Invalid analytics job payload: missing bakeryId");
  }

  logger.info("Running background analytics refresh", { bakeryId });
}
