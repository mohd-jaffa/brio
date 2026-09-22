import { type NotificationPayload, type PushNotificationProvider } from "./types";
import { logger } from "@/shared/logging/logger";

// A platform abstraction for Capacitor push notifications.
// Actual capacitor integration will be added when the mobile container is wrapped.
export class CapacitorPushProvider implements PushNotificationProvider {
  async requestPermissions(): Promise<boolean> {
    logger.info("Requesting Push Notification permissions (mock)");
    return true;
  }

  async sendPush(token: string, payload: NotificationPayload): Promise<boolean> {
    logger.info("Sending push notification via Capacitor (mock)", { token, payload });
    // In actual implementation, we would interface with Firebase Cloud Messaging 
    // or APNs through the backend or locally if it's local notification.
    return true;
  }
}
