import { WorkerService } from "../workers/service";
import { CapacitorPushProvider } from "./capacitor-push.service";
import { type Job } from "../workers/types";
import { logger } from "@/shared/logging/logger";

export class NotificationWorker {
  private readonly pushProvider: CapacitorPushProvider;

  constructor(private readonly workerService: WorkerService) {
    this.pushProvider = new CapacitorPushProvider();
  }

  register() {
    this.workerService.registerHandler("SEND_PUSH_NOTIFICATION", this.handlePushNotification.bind(this));
    logger.info("NotificationWorker registered handlers");
  }

  private async handlePushNotification(job: Job): Promise<void> {
    const { token, payload } = job.payload as { token?: string; payload?: any };
    
    if (!token || !payload) {
      throw new Error("Invalid push notification job payload: missing token or payload");
    }

    const success = await this.pushProvider.sendPush(token, payload);
    if (!success) {
      throw new Error("Failed to send push notification");
    }
  }
}
