"use client";

import { useCallback } from "react";
import useSWR from "swr";

import { askForReminders, reminderPermission, type ReminderPermission } from "./reminders";

// Not an API route: the answer is the device's, read through the plugin or the browser.
const KEY = "native:reminder-permission";

/**
 * Whether the device may show order reminders (R8.6), shared by everything
 * that asks. It is read again whenever the app comes back into view, since the
 * owner may have changed it in the phone's or the browser's settings
 * meanwhile. `ask` asks, and everything that reads it follows the answer; if
 * asking fails, it is read afresh and the failure thrown.
 */
export function useReminderPermission(): {
  permission: ReminderPermission | undefined;
  ask: () => Promise<ReminderPermission>;
} {
  const { data, mutate } = useSWR<ReminderPermission>(KEY, reminderPermission, { revalidateOnFocus: true });
  const ask = useCallback(async () => {
    try {
      const answer = await askForReminders();
      await mutate(answer, { revalidate: false });
      return answer;
    } catch (failure) {
      await mutate();
      throw failure;
    }
  }, [mutate]);
  return { permission: data, ask };
}
