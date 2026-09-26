import type { NotificationKind } from "@/constants/statuses";

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushNotificationProvider {
  requestPermissions(): Promise<boolean>;
  sendPush(token: string, payload: NotificationPayload): Promise<boolean>;
}

/** One line of the inbox (plan §139.10), as the API answers it. */
export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Where tapping it goes, if anywhere. */
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
}
