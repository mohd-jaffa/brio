import { registerJobHandler } from "../workers/api";
import { CapacitorPushProvider } from "./capacitor-push.service";
import { type Job } from "../workers/types";
import { logger } from "@/shared/logging/logger";

const pushProvider = new CapacitorPushProvider();

export function registerNotificationWorker() {
  registerJobHandler("SEND_PUSH_NOTIFICATION", handlePushNotification);
  logger.info("NotificationWorker registered handlers");
}

async function handlePushNotification(job: Job): Promise<void> {
  const { token, payload } = job.payload as { token?: string; payload?: any };
  
  if (!token || !payload) {
    throw new Error("Invalid push notification job payload: missing token or payload");
  }

  const success = await pushProvider.sendPush(token, payload);
  if (!success) {
    throw new Error("Failed to send push notification");
  }
}
