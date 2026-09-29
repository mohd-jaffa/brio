import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Providers } from "@tests/support/providers";

const native = vi.hoisted(() => ({ reminderPermission: vi.fn(), askForReminders: vi.fn() }));
vi.mock("@/lib/native/reminders", () => native);

import { useReminderPermission } from "@/lib/native/useReminderPermission";

beforeEach(() => {
  native.reminderPermission.mockReset().mockResolvedValue("OFF");
  native.askForReminders.mockReset().mockResolvedValue("ON");
});

describe("useReminderPermission", () => {
  it("reads whether the phone may show reminders", async () => {
    const { result } = renderHook(() => useReminderPermission(), { wrapper: Providers });
    expect(result.current.permission).toBeUndefined();
    await waitFor(() => expect(result.current.permission).toBe("OFF"));
  });

  it("asks Android, and everything reading it follows the answer without reading again", async () => {
    const { result } = renderHook(
      () => ({ asking: useReminderPermission(), reading: useReminderPermission() }),
      { wrapper: Providers },
    );
    await waitFor(() => expect(result.current.reading.permission).toBe("OFF"));

    let answer: string | undefined;
    await act(async () => {
      answer = await result.current.asking.ask();
    });
    expect(answer).toBe("ON");
    expect(result.current.reading.permission).toBe("ON");
    expect(native.reminderPermission).toHaveBeenCalledOnce();
  });

  it("reads it afresh when asking fails, and hands the failure back", async () => {
    const { result } = renderHook(() => useReminderPermission(), { wrapper: Providers });
    await waitFor(() => expect(result.current.permission).toBe("OFF"));
    native.askForReminders.mockRejectedValueOnce(new Error("offline"));
    native.reminderPermission.mockResolvedValue("BLOCKED");

    await act(async () => {
      await expect(result.current.ask()).rejects.toThrow("offline");
    });
    await waitFor(() => expect(result.current.permission).toBe("BLOCKED"));
  });
});
