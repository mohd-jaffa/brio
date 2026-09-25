import { JOB_TYPES } from "@/constants/jobs";
import { registerJobHandler } from "@/lib/jobs/queue";
import { CapacitorPushProvider } from "./capacitor-push.service";
import { type Job } from "@/lib/jobs/types";
import { type NotificationPayload } from "./types";
import { logger } from "@/lib/logger";

const pushProvider = new CapacitorPushProvider();

export function registerNotificationWorker() {
  registerJobHandler(JOB_TYPES.pushNotification, handlePushNotification);
  logger.info("NotificationWorker registered handlers");
}

async function handlePushNotification(job: Job): Promise<void> {
  const { token, payload } = job.payload as {
    token?: string;
    payload?: NotificationPayload;
  };

  if (!payload) {
    throw new Error("Push notification job has no message");
  }

  // No device is registered for this bakery yet (the token registry is not
  // built). Nothing to deliver is not a failure, so the job completes rather
  // than retrying its way into the dead-letter list.
  if (!token) {
    logger.info("Push notification skipped: no device registered", { jobId: job.id });
    return;
  }

  if (!(await pushProvider.sendPush(token, payload))) {
    throw new Error("Failed to send push notification");
  }
}
