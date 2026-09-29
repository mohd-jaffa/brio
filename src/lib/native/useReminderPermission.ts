"use client";

import { useCallback } from "react";
import useSWR from "swr";

import { askForReminders, reminderPermission, type ReminderPermission } from "./reminders";

// Not an API route: the answer is the phone's, read through the plugin.
const KEY = "native:reminder-permission";

/**
 * Whether the phone may show order reminders (R8.6), shared by everything that
 * asks. It is read again whenever the app comes back into view, since the
 * owner may have changed it in Android's settings meanwhile. `ask` asks
 * Android, and everything that reads it follows the answer.
 */
export function useReminderPermission(): {
  permission: ReminderPermission | undefined;
  ask: () => Promise<ReminderPermission>;
} {
  const { data, mutate } = useSWR<ReminderPermission>(KEY, reminderPermission, { revalidateOnFocus: true });
  const ask = useCallback(async () => {
    const answer = await askForReminders();
    await mutate(answer, { revalidate: false });
    return answer;
  }, [mutate]);
  return { permission: data, ask };
}
