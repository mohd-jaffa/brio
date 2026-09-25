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

import { registerNotificationWorker } from "@/features/notifications/worker";

const job = (payload: Record<string, unknown>) => ({ id: "j-1", type: "SEND_PUSH_NOTIFICATION", payload }) as Job;

function handler() {
  registerNotificationWorker();
  const [type, handle] = registerJobHandler.mock.calls[0];
  expect(type).toBe("SEND_PUSH_NOTIFICATION");
  return handle as (job: Job) => Promise<void>;
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

  it("fails the attempt when the push is refused, or there is nothing to send", async () => {
    sendPush.mockResolvedValue(false);
    const handle = handler();
    await expect(handle(job({ token: "device-1", payload: { title: "t", body: "b" } }))).rejects.toThrow();
    await expect(handle(job({}))).rejects.toThrow();
  });
});
