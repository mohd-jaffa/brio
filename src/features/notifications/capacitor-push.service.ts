import { type NotificationPayload, type PushNotificationProvider } from "./types";
import { logger } from "@/lib/logger";

// A platform abstraction for Capacitor push notifications.
// Actual capacitor integration will be added when the mobile container is wrapped.
export class CapacitorPushProvider implements PushNotificationProvider {
  async requestPermissions(): Promise<boolean> {
    logger.info("Requesting Push Notification permissions (mock)");
    return true;
  }

  async sendPush(token: string, payload: NotificationPayload): Promise<boolean> {
    // Never the token itself: it addresses one person's device.
    logger.info("Sending push notification via Capacitor (mock)", { title: payload.title, hasToken: token.length > 0 });
    // In actual implementation, we would interface with Firebase Cloud Messaging
    // or APNs through the backend or locally if it's local notification.
    return true;
  }
}
