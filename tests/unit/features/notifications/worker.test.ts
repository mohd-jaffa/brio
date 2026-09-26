import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Job } from "@/lib/jobs/types";

const registerJobHandler = vi.hoisted(() => vi.fn());
vi.mock("@/lib/jobs/queue", () => ({ registerJobHandler }));
const sendPush = vi.hoisted(() => vi.fn());
vi.mock("@/features/notifications/capacitor-push.service", () => ({
  CapacitorPushProvider: class {
    sendPush = sendPush;
  },
}));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
const { sendAccountConfirmation, sendEmailChangeConfirmation, serviceClient } = vi.hoisted(() => ({
  sendAccountConfirmation: vi.fn(),
  sendEmailChangeConfirmation: vi.fn(),
  serviceClient: { service: true },
}));
vi.mock("@/features/auth/api", () => ({ sendAccountConfirmation }));
vi.mock("@/features/auth/account", () => ({ sendEmailChangeConfirmation }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServiceRoleClient: () => serviceClient }));

import { registerNotificationWorker } from "@/features/notifications/worker";

const job = (payload: Record<string, unknown>) => ({ id: "j-1", type: "SEND_PUSH_NOTIFICATION", payload }) as Job;

function handler(type = "SEND_PUSH_NOTIFICATION") {
  registerNotificationWorker();
  const registered = registerJobHandler.mock.calls.find(([name]) => name === type);
  expect(registered).toBeDefined();
  return registered![1] as (job: Job) => Promise<void>;
}

beforeEach(() => vi.clearAllMocks());

describe("the notification worker", () => {
  it("completes a push with no device to reach, rather than retrying it into failure", async () => {
    await expect(handler()(job({ payload: { title: "t", body: "b" } }))).resolves.toBeUndefined();
    expect(sendPush).not.toHaveBeenCalled();
  });

  it("sends a push to the device it names", async () => {
    sendPush.mockResolvedValue(true);
    await handler()(job({ token: "device-1", payload: { title: "t", body: "b" } }));
    expect(sendPush).toHaveBeenCalledWith("device-1", { title: "t", body: "b" });
  });

  it("writes what happened into words as it sends it (BUG-26)", async () => {
    sendPush.mockResolvedValue(true);
    await handler()(
      job({
        token: "device-1",
        bakeryId: "b-1",
        message: { kind: "ORDER_STATUS", orderNumber: "ORD-1028", status: "READY", deliveryType: "PICKUP" },
      }),
    );
    expect(sendPush).toHaveBeenCalledWith("device-1", { title: "Order updated", body: "ORD-1028 is now Ready." });
  });

  it("fails the attempt when the push is refused, or there is nothing to send", async () => {
    sendPush.mockResolvedValue(false);
    const handle = handler();
    await expect(handle(job({ token: "device-1", payload: { title: "t", body: "b" } }))).rejects.toThrow();
    await expect(handle(job({}))).rejects.toThrow();
    await expect(handle(job({ message: { kind: "UNKNOWN" } }))).rejects.toThrow();
  });

  it("sends the confirmation email a registration queued, as the server", async () => {
    await handler("SEND_ACCOUNT_CONFIRMATION")(job({ userId: "u-1" }));
    expect(sendAccountConfirmation).toHaveBeenCalledWith(serviceClient, "u-1");
  });

  it("fails a confirmation job that names no user", async () => {
    await expect(handler("SEND_ACCOUNT_CONFIRMATION")(job({}))).rejects.toThrow("Confirmation job has no user");
    expect(sendAccountConfirmation).not.toHaveBeenCalled();
  });

  it("sends a new email address its link, as the server, and fails a job that names no user", async () => {
    await handler("SEND_EMAIL_CHANGE_CONFIRMATION")(job({ userId: "u-1" }));
    expect(sendEmailChangeConfirmation).toHaveBeenCalledWith(serviceClient, "u-1");
    await expect(handler("SEND_EMAIL_CHANGE_CONFIRMATION")(job({}))).rejects.toThrow("Email change job has no user");
  });
});
