"use client";

import { NOTIFICATION_REFRESH_MS } from "@/constants/limits";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

/**
 * How many notifications wait unread, for the bell (plan §139.10). The worker
 * writes them a moment after what they report, so the count is asked for
 * again every so often, and whenever the app comes back into view.
 */
export function useUnreadNotifications(): number {
  const { data } = useApiQuery<{ unread: number }>(apiRoutes.notifications.unread, {
    refreshInterval: NOTIFICATION_REFRESH_MS,
  });
  return data?.unread ?? 0;
}
