import { describe, expect, it } from "vitest";

import { notificationIdSchema, notificationListQuerySchema, pushSubscriptionSchema } from "@/lib/validation/schemas/notification";

const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc:DEF_123",
  keys: {
    p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
    auth: "tBHItJI5svbpez7KI4CCXg",
  },
};

describe("notificationListQuerySchema", () => {
  it("reads a tab, all of them when none is named", () => {
    expect(notificationListQuerySchema.parse({})).toMatchObject({ tab: "ALL" });
    expect(notificationListQuerySchema.safeParse({ tab: "SOMETIMES" }).success).toBe(false);
  });

  it("names one notification by its id", () => {
    expect(notificationIdSchema.safeParse("not-an-id").success).toBe(false);
  });
});

describe("pushSubscriptionSchema (R8.6)", () => {
  it("takes a browser's subscription as it gives it, keys unaltered", () => {
    expect(pushSubscriptionSchema.parse({ ...subscription, expirationTime: null })).toEqual(subscription);
  });

  it("takes only an https push service", () => {
    for (const endpoint of ["http://push.example/abc", "javascript:alert(1)", "not a url", `https://push.example/${"a".repeat(1024)}`]) {
      expect(pushSubscriptionSchema.safeParse({ ...subscription, endpoint }).success).toBe(false);
    }
  });

  it("takes keys only as base64url, and bounded", () => {
    for (const keys of [
      { ...subscription.keys, p256dh: "not base64!" },
      { ...subscription.keys, auth: "a".repeat(101) },
      { p256dh: subscription.keys.p256dh },
    ]) {
      expect(pushSubscriptionSchema.safeParse({ ...subscription, keys }).success).toBe(false);
    }
  });
});
