import { UI_TEXT } from "@/constants/messages";

import { hasPlugins } from "./platform";

/**
 * Reminders the Android app sets for itself (R8.6; the user, 2026-09-29).
 * Push from a server needs something awake to send it — the worker — and none
 * runs (plan §139.11.15). So the phone schedules its own notifications for the
 * orders it has read, by the inbox's rule (0023): due soon and overdue, each
 * once, in the business's morning. Nothing leaves the phone and no token is
 * kept; the app replaces the whole set each time it reads the orders again.
 *
 * In a browser there is nothing to set, and every call here does nothing.
 */

/** One reminder, as the server words it (`GET /api/notifications/reminders`). */
export interface Reminder {
  /** The same order's same reminder keeps its key from one read to the next. */
  key: string;
  /** When it is shown: an instant. */
  at: string;
  title: string;
  body: string;
  /** The screen tapping it opens. */
  url: string | null;
}

/** Whether the phone may show them: the Android permission, or no Android app at all. */
export type ReminderPermission = "ON" | "OFF" | "BLOCKED" | "UNSUPPORTED";

const PLUGIN = "LocalNotifications";
// Android's channel: its name is what the phone's own settings list.
const CHANNEL = "orders";
// The status-bar icon (scripts/brand.mjs) and the brand's green behind it.
const SMALL_ICON = "ic_stat_brio";
const ICON_COLOR = "#1d4932";

/** Whether this is the Android app, and its build carries the plugin (§139.17.1). */
export function remindersSupported(): boolean {
  return hasPlugins(PLUGIN);
}

const plugin = async () => (await import("@capacitor/local-notifications")).LocalNotifications;

const PERMISSIONS: Record<string, ReminderPermission> = { granted: "ON", denied: "BLOCKED" };
const toPermission = (state: string): ReminderPermission => PERMISSIONS[state] ?? "OFF";

export async function reminderPermission(): Promise<ReminderPermission> {
  if (!remindersSupported()) return "UNSUPPORTED";
  return toPermission((await (await plugin()).checkPermissions()).display);
}

/** Asks Android for the permission; once refused, Android answers without asking. */
export async function askForReminders(): Promise<ReminderPermission> {
  if (!remindersSupported()) return "UNSUPPORTED";
  return toPermission((await (await plugin()).requestPermissions()).display);
}

/** The number Android keys a reminder by: the same for the same key, positive and within Java's int. */
export function reminderId(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 0x01000193);
  }
  // 1 to 2³⁰: never 0, and inside Java's int.
  return (hash >>> 2) + 1;
}

// What this page last handed Android, so a read that changed nothing sets nothing.
let scheduled: string | null = null;

/**
 * Makes `reminders` the phone's whole set: those waiting are cancelled and
 * these set in their place. None is exact — the plugin would otherwise open
 * Android's "Alarms & reminders" screen — so Android may hold one a few
 * minutes to save the battery. Without the permission it sets nothing.
 */
export async function scheduleReminders(reminders: readonly Reminder[]): Promise<void> {
  if (!remindersSupported()) return;
  const signature = JSON.stringify(reminders);
  if (signature === scheduled) return;
  const notifications = await plugin();
  if ((await notifications.checkPermissions()).display !== "granted") return;

  await notifications.createChannel({
    id: CHANNEL,
    name: UI_TEXT.notifications.channel,
    description: UI_TEXT.notifications.channelDescription,
    importance: 4,
    // Private: a locked screen that hides what notifications say hides these.
    visibility: 0,
  });
  await cancelPending();
  if (reminders.length > 0) {
    await notifications.schedule({
      notifications: reminders.map((reminder) => ({
        id: reminderId(reminder.key),
        title: reminder.title,
        body: reminder.body,
        channelId: CHANNEL,
        smallIcon: SMALL_ICON,
        iconColor: ICON_COLOR,
        schedule: { at: new Date(reminder.at), allowWhileIdle: true },
        isExactNotification: false,
        extra: { url: reminder.url },
      })),
    });
  }
  scheduled = signature;
}

async function cancelPending() {
  const notifications = await plugin();
  const { notifications: pending } = await notifications.getPending();
  if (pending.length > 0) await notifications.cancel({ notifications: pending.map(({ id }) => ({ id })) });
}

/**
 * Nothing of this account left on the phone: those waiting cancelled, those
 * shown taken down. Called as the account leaves (signing out, deleting it).
 */
export async function clearReminders(): Promise<void> {
  scheduled = null;
  if (!remindersSupported()) return;
  await cancelPending();
  await (await plugin()).removeAllDeliveredNotifications();
}

/**
 * Calls `open` with the screen a tapped reminder leads to — also for the tap
 * that started the app, which Android holds until this listens. Answers how to
 * stop listening.
 */
export function onReminderTapped(open: (url: string) => void): () => void {
  if (!remindersSupported()) return () => undefined;
  let stop: (() => void) | undefined;
  let gone = false;
  void plugin().then(async (notifications) => {
    const listener = await notifications.addListener("localNotificationActionPerformed", ({ notification }) => {
      const url: unknown = notification.extra?.url;
      // Only a screen of this app: never another site.
      if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//")) open(url);
    });
    if (gone) void listener.remove();
    else stop = () => void listener.remove();
  });
  return () => {
    gone = true;
    stop?.();
  };
}
