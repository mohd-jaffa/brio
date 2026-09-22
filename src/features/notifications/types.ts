export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushNotificationProvider {
  requestPermissions(): Promise<boolean>;
  sendPush(token: string, payload: NotificationPayload): Promise<boolean>;
}
