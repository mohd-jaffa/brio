import { beforeEach, describe, expect, it, vi } from "vitest";

import { PUSH_TTL_SECONDS } from "@/constants/limits";
import type { NotificationMessage } from "@/features/notifications/text";
import { AppError } from "@/lib/errors/AppError";
import { fakeSupabase } from "@tests/support/supabase";
import { tenantOf } from "@tests/support/tenant";

const KEYS = { publicKey: "BPublic", privateKey: "private", subject: "mailto:hello@brio.app" };

const { env, push, service, logger } = vi.hoisted(() => {
  class WebPushError extends Error {
    constructor(public statusCode: number) {
      super(`push service answered ${statusCode}`);
    }
  }
  return {
    env: { keys: null as typeof KEYS | null },
    push: { sendNotification: vi.fn(), WebPushError },
    service: { client: undefined as unknown },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
});
vi.mock("web-push", () => ({ default: { sendNotification: push.sendNotification }, WebPushError: push.WebPushError }));
vi.mock("@/lib/env/server", () => ({ webPushKeys: () => env.keys }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServiceRoleClient: () => service.client }));
vi.mock("@/lib/logger", () => ({ logger }));

const { pushMessage, pushToBusiness, registerDevice } = await import("@/features/notifications/push");

const due: NotificationMessage = {
  kind: "ORDER_DUE",
  orderId: "o-1",
  orderNumber: "ORD-1028",
  customerName: "Priya Menon",
  day: "TOMORROW",
};
const late: NotificationMessage = {
  kind: "ORDER_OVERDUE",
  orderId: "o-2",
  orderNumber: "ORD-1020",
  customerName: null,
  dueDate: "2026-09-26",
};

const device = (id: string) => ({ id, token: `https://push.example/${id}`, p256dh: `key-${id}`, auth: `auth-${id}` });

beforeEach(() => {
  vi.clearAllMocks();
  env.keys = KEYS;
  push.sendNotification.mockResolvedValue({ statusCode: 201 });
});

describe("pushMessage", () => {
  it("carries the inbox's words, where a tap leads, and a tag naming the reminder", () => {
    expect(pushMessage(due)).toEqual({
      title: "Due soon",
      body: "ORD-1028 for Priya Menon is due tomorrow.",
      url: "/orders/o-1",
      tag: "ORDER_DUE:o-1",
    });
    expect(pushMessage({ kind: "CUSTOMER_ADDED", customerId: "c-1", name: "Asha" }).tag).toBe("CUSTOMER_ADDED");
  });
});

describe("registerDevice", () => {
  const subscription = { endpoint: "https://push.example/d-1", keys: { p256dh: "key-d-1", auth: "auth-d-1" } };

  it("keeps the browser against the owner, taking it over from whoever had it, and renews its last sight", async () => {
    const fake = fakeSupabase(() => ({ data: null }));
    service.client = fake.client;
    await expect(registerDevice(tenantOf(fake.client), subscription)).resolves.toEqual({ registered: true });

    const [query] = fake.queries;
    expect(query.table).toBe("device_tokens");
    expect(fake.argsOf(query, "upsert")).toEqual([
      [
        {
          bakery_id: "b-1",
          profile_id: expect.any(String),
          platform: "WEB",
          token: "https://push.example/d-1",
          p256dh: "key-d-1",
          auth: "auth-d-1",
          last_seen_at: expect.any(String),
        },
        { onConflict: "token" },
      ],
    ]);
  });

  it("refuses while web push has no keys, and says a failure in the app's words", async () => {
    env.keys = null;
    await expect(registerDevice(tenantOf({}), subscription)).rejects.toMatchObject({ code: "PUSH_UNAVAILABLE" });

    env.keys = KEYS;
    service.client = fakeSupabase(() => ({ error: { code: "57014", message: "canceling statement" } })).client;
    await expect(registerDevice(tenantOf({}), subscription)).rejects.toBeInstanceOf(AppError);
  });
});

describe("pushToBusiness", () => {
  it("sends each message to each of the business's browsers, encrypted to each, for half a day at most", async () => {
    const fake = fakeSupabase(() => ({ data: [device("d-1"), device("d-2")] }));
    await expect(pushToBusiness(fake.client, "b-1", [due, late])).resolves.toEqual({ sent: 4, gone: 0 });

    const [read] = fake.queries;
    expect(fake.argsOf(read, "eq")).toEqual([
      ["bakery_id", "b-1"],
      ["platform", "WEB"],
    ]);
    expect(push.sendNotification).toHaveBeenCalledWith(
      { endpoint: "https://push.example/d-1", keys: { p256dh: "key-d-1", auth: "auth-d-1" } },
      JSON.stringify(pushMessage(due)),
      { TTL: PUSH_TTL_SECONDS, urgency: "normal", vapidDetails: KEYS },
    );
    expect(push.sendNotification).toHaveBeenCalledTimes(4);
    expect(logger.info).toHaveBeenCalledWith("Pushed reminders", { bakeryId: "b-1", sent: 4, gone: 0 });
  });

  it("lets go of a browser its push service no longer knows, and sends it nothing more", async () => {
    const fake = fakeSupabase(({ table, calls }) => ({
      data: table === "device_tokens" && calls[0][0] === "select" ? [device("d-1"), device("d-2")] : null,
    }));
    push.sendNotification.mockImplementation(async ({ endpoint }: { endpoint: string }) => {
      if (endpoint.endsWith("d-1")) throw new push.WebPushError(410);
      return { statusCode: 201 };
    });

    await expect(pushToBusiness(fake.client, "b-1", [due, late])).resolves.toEqual({ sent: 2, gone: 1 });
    const removal = fake.queries.find((query) => query.calls.some(([name]) => name === "delete"))!;
    expect(fake.argsOf(removal, "in")).toEqual([["id", ["d-1"]]]);
  });

  it("logs any other failure without the browser's address, and goes on to the rest", async () => {
    const fake = fakeSupabase(() => ({ data: [device("d-1")] }));
    push.sendNotification
      .mockRejectedValueOnce(new push.WebPushError(500))
      .mockRejectedValueOnce(new Error("socket hang up"));

    await expect(pushToBusiness(fake.client, "b-1", [due, late])).resolves.toEqual({ sent: 0, gone: 0 });
    expect(logger.warn).toHaveBeenCalledWith("Push not sent", { bakeryId: "b-1", deviceId: "d-1", status: 500 });
    expect(logger.warn).toHaveBeenCalledWith("Push not sent", {
      bakeryId: "b-1",
      deviceId: "d-1",
      reason: "socket hang up",
    });
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain("push.example");
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("logs a browser it could not let go of, or browsers it could not read, and throws neither", async () => {
    const failing = fakeSupabase(({ calls }) =>
      calls[0][0] === "select"
        ? { data: [device("d-1")] }
        : { error: { code: "57014", message: "canceling statement" } },
    );
    push.sendNotification.mockRejectedValueOnce(new push.WebPushError(404));
    await expect(pushToBusiness(failing.client, "b-1", [due])).resolves.toEqual({ sent: 0, gone: 1 });
    expect(logger.warn).toHaveBeenCalledWith("Gone push devices not removed", {
      bakeryId: "b-1",
      reason: "canceling statement",
    });

    const unreadable = fakeSupabase(() => ({ error: { code: "57014", message: "canceling statement" } }));
    await expect(pushToBusiness(unreadable.client, "b-1", [due])).resolves.toEqual({ sent: 0, gone: 0 });
    expect(logger.warn).toHaveBeenCalledWith("Push devices not read", {
      bakeryId: "b-1",
      reason: "canceling statement",
    });

    const none = fakeSupabase(() => ({ data: null }));
    await expect(pushToBusiness(none.client, "b-1", [due])).resolves.toEqual({ sent: 0, gone: 0 });
  });

  it("sends nothing, and reads nothing, without keys or without messages", async () => {
    const fake = fakeSupabase(() => ({ data: [device("d-1")] }));
    await expect(pushToBusiness(fake.client, "b-1", [])).resolves.toEqual({ sent: 0, gone: 0 });
    env.keys = null;
    await expect(pushToBusiness(fake.client, "b-1", [due])).resolves.toEqual({ sent: 0, gone: 0 });
    expect(fake.queries).toHaveLength(0);
    expect(push.sendNotification).not.toHaveBeenCalled();
  });

  it("logs a failure that is not an Error in words", async () => {
    const fake = fakeSupabase(() => ({ data: [device("d-1")] }));
    push.sendNotification.mockRejectedValueOnce("offline");
    await pushToBusiness(fake.client, "b-1", [due]);
    expect(logger.warn).toHaveBeenCalledWith("Push not sent", { bakeryId: "b-1", deviceId: "d-1", reason: "offline" });
  });
});
