import { beforeEach, describe, expect, it, vi } from "vitest";

const android = vi.hoisted(() => ({ on: true }));
vi.mock("@/lib/native/platform", () => ({
  hasPlugins: (...names: string[]) => android.on && names.every((name) => name === "LocalNotifications"),
}));

type Tapped = (event: { notification: { extra?: { url?: unknown } } }) => void;
const plugin = vi.hoisted(() => ({
  display: "granted",
  pending: [] as { id: number }[],
  tapped: undefined as Tapped | undefined,
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  createChannel: vi.fn(),
  getPending: vi.fn(),
  cancel: vi.fn(),
  schedule: vi.fn(),
  removeAllDeliveredNotifications: vi.fn(),
  remove: vi.fn(),
  addListener: vi.fn(),
}));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: plugin }));

import {
  askForReminders,
  clearReminders,
  onReminderTapped,
  reminderId,
  reminderPermission,
  remindersSupported,
  scheduleReminders,
  type Reminder,
} from "@/lib/native/reminders";

const tomorrow: Reminder = {
  key: "ORDER_DUE:o-1",
  at: "2026-09-30T02:30:00.000Z",
  title: "Due soon",
  body: "ORD-1028 for Priya Menon is due tomorrow.",
  url: "/orders/o-1",
};
const late: Reminder = { ...tomorrow, key: "ORDER_OVERDUE:o-1", at: "2026-10-02T02:30:00.000Z", title: "Overdue" };

beforeEach(async () => {
  android.on = true;
  plugin.display = "granted";
  plugin.pending = [];
  plugin.tapped = undefined;
  plugin.checkPermissions.mockReset().mockImplementation(async () => ({ display: plugin.display }));
  plugin.requestPermissions.mockReset().mockImplementation(async () => ({ display: plugin.display }));
  plugin.createChannel.mockReset().mockResolvedValue(undefined);
  plugin.getPending.mockReset().mockImplementation(async () => ({ notifications: plugin.pending }));
  plugin.cancel.mockReset().mockResolvedValue(undefined);
  plugin.schedule.mockReset().mockResolvedValue({ notifications: [] });
  plugin.removeAllDeliveredNotifications.mockReset().mockResolvedValue(undefined);
  plugin.remove.mockReset();
  plugin.addListener.mockReset().mockImplementation(async (_event: string, handler: Tapped) => {
    plugin.tapped = handler;
    return { remove: plugin.remove };
  });
  // Each test starts with nothing set on this page.
  await clearReminders();
  vi.clearAllMocks();
});

describe("in a browser", () => {
  it("has nothing to set, and does nothing", async () => {
    android.on = false;
    expect(remindersSupported()).toBe(false);
    expect(await reminderPermission()).toBe("UNSUPPORTED");
    expect(await askForReminders()).toBe("UNSUPPORTED");
    await scheduleReminders([tomorrow]);
    await clearReminders();
    onReminderTapped(vi.fn())();
    expect(plugin.checkPermissions).not.toHaveBeenCalled();
    expect(plugin.schedule).not.toHaveBeenCalled();
    expect(plugin.addListener).not.toHaveBeenCalled();
  });
});

describe("the permission", () => {
  it.each([
    ["granted", "ON"],
    ["denied", "BLOCKED"],
    ["prompt", "OFF"],
    ["prompt-with-rationale", "OFF"],
  ])("reads Android's %s as %s, and asks for it", async (display, permission) => {
    plugin.display = display;
    expect(await reminderPermission()).toBe(permission);
    expect(await askForReminders()).toBe(permission);
    expect(plugin.requestPermissions).toHaveBeenCalledOnce();
  });
});

describe("reminderId", () => {
  it("is the same for the same key, differs between keys, and is a positive Java int", () => {
    const ids = [tomorrow.key, late.key, "ORDER_DUE:o-2", ""].map(reminderId);
    expect(reminderId(tomorrow.key)).toBe(ids[0]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThan(0);
      expect(id).toBeLessThanOrEqual(2 ** 31 - 1);
    }
  });
});

describe("scheduleReminders", () => {
  it("replaces what waits with the whole set, on the reminders' own channel, never as exact alarms", async () => {
    plugin.pending = [{ id: 7 }, { id: 9 }];
    await scheduleReminders([tomorrow, late]);

    expect(plugin.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({ id: "orders", name: "Order reminders", importance: 4, visibility: 0 }),
    );
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: 7 }, { id: 9 }] });
    expect(plugin.schedule).toHaveBeenCalledWith({
      notifications: [tomorrow, late].map((reminder) => ({
        id: reminderId(reminder.key),
        title: reminder.title,
        body: reminder.body,
        channelId: "orders",
        smallIcon: "ic_stat_brio",
        iconColor: "#1d4932",
        schedule: { at: new Date(reminder.at), allowWhileIdle: true },
        isExactNotification: false,
        extra: { url: "/orders/o-1" },
      })),
    });
    expect(plugin.cancel.mock.invocationCallOrder[0]).toBeLessThan(plugin.schedule.mock.invocationCallOrder[0]);
  });

  it("sets nothing again when a read changed nothing, and sets again when it did", async () => {
    await scheduleReminders([tomorrow]);
    await scheduleReminders([tomorrow]);
    expect(plugin.schedule).toHaveBeenCalledOnce();
    await scheduleReminders([late]);
    expect(plugin.schedule).toHaveBeenCalledTimes(2);
  });

  it("cancels what waits and sets none when no order is owed one", async () => {
    plugin.pending = [{ id: 7 }];
    await scheduleReminders([]);
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: 7 }] });
    expect(plugin.schedule).not.toHaveBeenCalled();
  });

  it("sets nothing without the permission, and sets them once it is given", async () => {
    plugin.display = "prompt";
    await scheduleReminders([tomorrow]);
    expect(plugin.createChannel).not.toHaveBeenCalled();
    expect(plugin.schedule).not.toHaveBeenCalled();

    plugin.display = "granted";
    await scheduleReminders([tomorrow]);
    expect(plugin.schedule).toHaveBeenCalledOnce();
  });
});

describe("clearReminders", () => {
  it("cancels what waits, takes down what was shown, and sets the next account's afresh", async () => {
    await scheduleReminders([tomorrow]);
    plugin.pending = [{ id: reminderId(tomorrow.key) }];
    await clearReminders();
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: reminderId(tomorrow.key) }] });
    expect(plugin.removeAllDeliveredNotifications).toHaveBeenCalledOnce();

    await scheduleReminders([tomorrow]);
    expect(plugin.schedule).toHaveBeenCalledTimes(2);
  });
});

describe("onReminderTapped", () => {
  it("opens the screen a tapped reminder leads to, and only a screen of this app", async () => {
    const open = vi.fn();
    const stop = onReminderTapped(open);
    await vi.waitFor(() => expect(plugin.tapped).toBeDefined());
    expect(plugin.addListener).toHaveBeenCalledWith("localNotificationActionPerformed", expect.any(Function));

    plugin.tapped!({ notification: { extra: { url: "/orders/o-1" } } });
    for (const url of ["https://elsewhere.example", "//elsewhere.example", null, undefined]) {
      plugin.tapped!({ notification: { extra: { url } } });
    }
    plugin.tapped!({ notification: {} });
    expect(open.mock.calls).toEqual([["/orders/o-1"]]);

    stop();
    expect(plugin.remove).toHaveBeenCalledOnce();
  });

  it("lets go of the listener even when stopped before it is there", async () => {
    onReminderTapped(vi.fn())();
    await vi.waitFor(() => expect(plugin.remove).toHaveBeenCalledOnce());
  });
});
