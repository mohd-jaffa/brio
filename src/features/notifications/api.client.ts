import { postJson } from "@/lib/api/client";
import { apiRoutes } from "@/lib/query/keys";

export const NotificationsClient = {
  /** One marked read, as it is opened. */
  markRead: (id: string) => postJson<{ read: true }>(apiRoutes.notifications.read(id)),
  /** Every unread one marked read (plan §139.10). */
  markAllRead: () => postJson<{ read: number }>(apiRoutes.notifications.readAll),
};
