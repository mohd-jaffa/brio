"use client";

import { useEffect } from "react";

import { NOTIFICATION_REFRESH_MS } from "@/constants/limits";
import { scheduleReminders, useReminderPermission, type Reminder } from "@/lib/native";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

/**
 * Keeps the Android app's order reminders (R8.6) in step with the business:
 * once the owner has allowed them, it reads what should be set — as the app
 * opens, whenever it comes back into view, and every so often while it is open,
 * like the bell — and hands the phone the whole set. An order delivered or
 * moved is so taken off, or moved, within a minute. In a browser, and before
 * the permission, it reads nothing. Draws nothing.
 */
export function OrderReminders() {
  const { permission } = useReminderPermission();
  const { data } = useApiQuery<Reminder[]>(permission === "ON" ? apiRoutes.notifications.reminders : null, {
    refreshInterval: NOTIFICATION_REFRESH_MS,
  });

  useEffect(() => {
    // A reminder not set is not worth a card: the next read tries again.
    if (data) scheduleReminders(data).catch(() => undefined);
  }, [data]);

  return null;
}
