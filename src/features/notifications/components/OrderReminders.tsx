"use client";

import { useEffect } from "react";

import { NOTIFICATION_REFRESH_MS } from "@/constants/limits";
import { isAndroidApp, renewReminders, scheduleReminders, useReminderPermission, type Reminder } from "@/lib/native";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

/**
 * Keeps order reminders (R8.6) in step with the business, once the owner has
 * turned them on. Draws nothing.
 *
 * - **The Android app** reads what should be set — as the app opens, whenever
 *   it comes back into view, and every so often while it is open, like the
 *   bell — and hands the phone the whole set. An order delivered or moved is
 *   so taken off, or moved, within a minute.
 * - **A browser** tells the server, as the app opens, that it still wants
 *   them pushed; the server does the rest.
 */
export function OrderReminders() {
  const { permission } = useReminderPermission();
  const on = permission === "ON";
  const android = isAndroidApp();
  const { data } = useApiQuery<Reminder[]>(on && android ? apiRoutes.notifications.reminders : null, {
    refreshInterval: NOTIFICATION_REFRESH_MS,
  });

  // A reminder not set, or a browser not renewed, is not worth a card: the
  // next read, or the next opening, tries again.
  useEffect(() => {
    if (data) scheduleReminders(data).catch(() => undefined);
  }, [data]);

  useEffect(() => {
    if (on && !android) renewReminders().catch(() => undefined);
  }, [on, android]);

  return null;
}
