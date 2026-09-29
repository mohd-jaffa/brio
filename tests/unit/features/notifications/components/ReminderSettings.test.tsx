import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import type { ReminderPermission } from "@/lib/native";
import { Providers } from "@tests/support/providers";

const native = vi.hoisted(() => ({
  android: true,
  permission: undefined as ReminderPermission | undefined,
  ask: vi.fn(),
}));
vi.mock("@/lib/native", () => ({
  isAndroidApp: () => native.android,
  useReminderPermission: () => ({ permission: native.permission, ask: native.ask }),
}));

import { ReminderSettings } from "@/features/notifications/components/ReminderSettings";

const show = () => render(<ReminderSettings />, { wrapper: Providers });
const section = () => screen.getByRole("region", { name: "Notifications" });

beforeEach(() => {
  native.android = true;
  native.permission = "OFF";
  native.ask.mockReset().mockResolvedValue("ON");
});

describe("ReminderSettings", () => {
  it.each([undefined, "UNSUPPORTED"] as const)(
    "is not shown while the permission is %s: a browser has nothing to turn on",
    (permission) => {
      native.permission = permission;
      show();
      expect(screen.queryByRole("region", { name: "Notifications" })).not.toBeInTheDocument();
      expect(screen.queryByText("Order reminders")).not.toBeInTheDocument();
    },
  );

  it("offers to turn reminders on, asks Android, and says they are on", async () => {
    show();
    expect(section()).toHaveTextContent("Set on this phone for the orders it has seen.");
    const row = within(section()).getByRole("button", { name: /Order reminders/ });
    expect(row).toHaveTextContent("Tap to be reminded of orders due soon and overdue");
    expect(row).toHaveTextContent("Off");

    await userEvent.click(row);
    expect(native.ask).toHaveBeenCalledOnce();
    expect(await screen.findByRole("status")).toHaveTextContent("Reminders on");
  });

  it("says on a card when reminders could not be turned on, with its reference", async () => {
    native.ask.mockRejectedValue(
      new ApiError(422, "PUSH_UNAVAILABLE", "Reminders cannot be turned on here yet.", "req_7"),
    );
    show();
    await userEvent.click(within(section()).getByRole("button", { name: /Order reminders/ }));
    const card = await screen.findByRole("alertdialog", { name: "Reminders not turned on" });
    expect(card).toHaveTextContent("Reminders cannot be turned on here yet.");
    expect(card).toHaveTextContent("req_7");
  });

  it("in a browser, says where it is sent, and where a refusal is undone", () => {
    native.android = false;
    show();
    expect(section()).toHaveTextContent("Sent to this device, even when Brio is closed.");
    native.permission = "BLOCKED";
    cleanup();
    show();
    expect(section()).toHaveTextContent("Turned off in this browser’s settings for Brio");
  });

  it("says nothing more when Android was not allowed to", async () => {
    native.ask.mockResolvedValue("BLOCKED");
    show();
    await userEvent.click(within(section()).getByRole("button", { name: /Order reminders/ }));
    await waitFor(() => expect(native.ask).toHaveBeenCalledOnce());
    expect(screen.queryByText("Reminders on")).not.toBeInTheDocument();
  });

  it.each([
    ["ON", "Orders due soon, and overdue, each morning", "On"],
    ["BLOCKED", "Turned off in Android’s settings for Brio", "Off"],
  ] as const)("when %s, says so and offers nothing to tap", (permission, hint, state) => {
    native.permission = permission;
    show();
    expect(within(section()).queryByRole("button")).not.toBeInTheDocument();
    expect(section()).toHaveTextContent(hint);
    expect(section()).toHaveTextContent(state);
  });
});
