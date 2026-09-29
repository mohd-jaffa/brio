import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Reminder, ReminderPermission } from "@/lib/native";
import { Providers } from "@tests/support/providers";

const native = vi.hoisted(() => ({
  android: true,
  permission: undefined as ReminderPermission | undefined,
  scheduleReminders: vi.fn(),
  renewReminders: vi.fn(),
}));
vi.mock("@/lib/native", () => ({
  isAndroidApp: () => native.android,
  useReminderPermission: () => ({ permission: native.permission, ask: vi.fn() }),
  scheduleReminders: native.scheduleReminders,
  renewReminders: native.renewReminders,
}));
const { fetcher } = vi.hoisted(() => ({ fetcher: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ fetcher }));

import { OrderReminders } from "@/features/notifications/components/OrderReminders";

const reminder: Reminder = {
  key: "ORDER_DUE:o-1",
  at: "2026-09-30T02:30:00.000Z",
  title: "Due soon",
  body: "ORD-1028 for Priya Menon is due tomorrow.",
  url: "/orders/o-1",
};

beforeEach(() => {
  native.android = true;
  native.permission = "ON";
  native.scheduleReminders.mockReset().mockResolvedValue(undefined);
  native.renewReminders.mockReset().mockResolvedValue(undefined);
  fetcher.mockReset().mockResolvedValue([reminder]);
});

describe("OrderReminders", () => {
  it("reads what should be set once reminders are allowed, and hands the phone the whole set", async () => {
    render(<OrderReminders />, { wrapper: Providers });
    await waitFor(() => expect(native.scheduleReminders).toHaveBeenCalledWith([reminder]));
    expect(fetcher).toHaveBeenCalledWith("/api/notifications/reminders");
  });

  it.each([undefined, "OFF", "BLOCKED", "UNSUPPORTED"] as const)(
    "reads nothing while the permission is %s",
    async (permission) => {
      native.permission = permission;
      render(<OrderReminders />, { wrapper: Providers });
      await new Promise((settle) => setTimeout(settle, 20));
      expect(fetcher).not.toHaveBeenCalled();
      expect(native.scheduleReminders).not.toHaveBeenCalled();
    },
  );

  it("in a browser, reads nothing and tells the server it still wants them pushed, once as the app opens", async () => {
    native.android = false;
    const { rerender } = render(<OrderReminders />, { wrapper: Providers });
    rerender(<OrderReminders />);
    await waitFor(() => expect(native.renewReminders).toHaveBeenCalledOnce());
    expect(fetcher).not.toHaveBeenCalled();
    expect(native.scheduleReminders).not.toHaveBeenCalled();
  });

  it("in a browser with reminders off, tells the server nothing", async () => {
    native.android = false;
    native.permission = "OFF";
    render(<OrderReminders />, { wrapper: Providers });
    await new Promise((settle) => setTimeout(settle, 20));
    expect(native.renewReminders).not.toHaveBeenCalled();
  });

  it("lets a browser that could not be renewed try again next time, quietly", async () => {
    native.android = false;
    native.renewReminders.mockRejectedValue(new Error("offline"));
    render(<OrderReminders />, { wrapper: Providers });
    await waitFor(() => expect(native.renewReminders).toHaveBeenCalledOnce());
  });

  it("lets a reminder that could not be set wait for the next read, quietly", async () => {
    native.scheduleReminders.mockRejectedValue(new Error("plugin gone"));
    render(<OrderReminders />, { wrapper: Providers });
    await waitFor(() => expect(native.scheduleReminders).toHaveBeenCalledOnce());
  });
});
