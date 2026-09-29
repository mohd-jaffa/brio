import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Job } from "@/lib/jobs/types";

const { registerJobHandler, registerSweep } = vi.hoisted(() => ({
  registerJobHandler: vi.fn(),
  registerSweep: vi.fn(),
}));
vi.mock("@/lib/jobs/queue", () => ({ registerJobHandler, registerSweep }));
const sendPush = vi.hoisted(() => vi.fn());
vi.mock("@/features/notifications/capacitor-push.service", () => ({
  CapacitorPushProvider: class {
    sendPush = sendPush;
  },
}));
const logger = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger }));
const { sendAccountConfirmation, sendEmailChangeConfirmation, serviceClient } = vi.hoisted(() => ({
  sendAccountConfirmation: vi.fn(),
  sendEmailChangeConfirmation: vi.fn(),
  serviceClient: { service: true },
}));
vi.mock("@/features/auth/api", () => ({ sendAccountConfirmation }));
vi.mock("@/features/auth/account", () => ({ sendEmailChangeConfirmation }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServiceRoleClient: () => serviceClient }));
const { recordNotification, queueDueOrderNotifications } = vi.hoisted(() => ({
  recordNotification: vi.fn(),
  queueDueOrderNotifications: vi.fn(),
}));
vi.mock("@/features/notifications/api", () => ({ recordNotification, queueDueOrderNotifications }));

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

  it("files it in the business's inbox first, under the job's id, with its kind and where it leads", async () => {
    sendPush.mockResolvedValue(true);
    await handler()(
      job({
        bakeryId: "b-1",
        message: { kind: "STOCK_LOW", productId: "p-1", productName: "Brownies", balance: 3, unit: "piece" },
      }),
    );
    expect(recordNotification).toHaveBeenCalledWith(serviceClient, {
      id: "j-1",
      bakeryId: "b-1",
      kind: "STOCK",
      text: { title: "Low stock", body: "Brownies is down to 3 pieces." },
      actionUrl: "/inventory",
    });
    // No device yet: in the inbox all the same, and done.
    expect(sendPush).not.toHaveBeenCalled();
  });

  it("files words queued ready-made as the system's, leading nowhere", async () => {
    await handler()(job({ bakeryId: "b-1", payload: { title: "t", body: "b" } }));
    expect(recordNotification).toHaveBeenCalledWith(serviceClient, {
      id: "j-1",
      bakeryId: "b-1",
      kind: "SYSTEM",
      text: { title: "t", body: "b" },
      actionUrl: null,
    });
  });

  it("files nothing for a job that names no business, and pushes nothing once filing fails", async () => {
    await handler()(job({ payload: { title: "t", body: "b" } }));
    expect(recordNotification).not.toHaveBeenCalled();

    recordNotification.mockRejectedValueOnce(new Error("database down"));
    await expect(
      handler()(job({ token: "device-1", bakeryId: "b-1", payload: { title: "t", body: "b" } })),
    ).rejects.toThrow("database down");
    expect(sendPush).not.toHaveBeenCalled();
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

  it("sweeps for orders due soon or overdue, and says when it queued any", async () => {
    registerNotificationWorker();
    const [name, sweep] = registerSweep.mock.calls[0] as [string, (client: unknown) => Promise<void>];
    expect(name).toBe("due orders");

    queueDueOrderNotifications.mockResolvedValueOnce(0);
    await sweep(serviceClient);
    expect(queueDueOrderNotifications).toHaveBeenCalledWith(serviceClient);
    expect(logger.info).not.toHaveBeenCalledWith("Queued notifications for orders due", expect.anything());

    queueDueOrderNotifications.mockResolvedValueOnce(2);
    await sweep(serviceClient);
    expect(logger.info).toHaveBeenCalledWith("Queued notifications for orders due", { queued: 2 });
  });
});
