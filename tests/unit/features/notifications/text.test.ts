import { describe, expect, it } from "vitest";

import { notificationText, readNotificationMessage } from "@/features/notifications/text";

describe("notificationText (BUG-26)", () => {
  it("names a status in words, and a finished pickup Completed", () => {
    expect(notificationText({ kind: "ORDER_STATUS", orderNumber: "ORD-1028", status: "IN_PROGRESS", deliveryType: "DELIVERY" })).toEqual({
      title: "Order updated",
      body: "ORD-1028 is now Preparing.",
    });
    expect(notificationText({ kind: "ORDER_STATUS", orderNumber: "ORD-1028", status: "DELIVERED", deliveryType: "PICKUP" }).body).toBe(
      "ORD-1028 is now Completed.",
    );
  });

  it("writes an amount in rupees, never paise", () => {
    expect(notificationText({ kind: "PAYMENT_RECEIVED", orderNumber: "ORD-1028", amount: 50000 })).toEqual({
      title: "Payment received",
      body: "₹500 received for ORD-1028.",
    });
  });
});

describe("readNotificationMessage", () => {
  it("reads the two messages the app queues", () => {
    const status = { kind: "ORDER_STATUS", orderNumber: "ORD-1", status: "READY", deliveryType: "PICKUP", orderId: "o-1" };
    expect(readNotificationMessage(status)).toEqual({ kind: "ORDER_STATUS", orderNumber: "ORD-1", status: "READY", deliveryType: "PICKUP" });
    expect(readNotificationMessage({ kind: "PAYMENT_RECEIVED", orderNumber: "ORD-1", amount: 500 })).toEqual({
      kind: "PAYMENT_RECEIVED",
      orderNumber: "ORD-1",
      amount: 500,
    });
  });

  it("reads nothing it cannot put into words", () => {
    for (const message of [
      undefined,
      null,
      "ORD-1 is now READY",
      { kind: "ORDER_STATUS", orderNumber: "ORD-1", status: "SHIPPED", deliveryType: "PICKUP" },
      { kind: "ORDER_STATUS", orderNumber: "ORD-1", status: "READY", deliveryType: "DRONE" },
      { kind: "PAYMENT_RECEIVED", orderNumber: "ORD-1", amount: 1.5 },
      { kind: "PAYMENT_RECEIVED", amount: 500 },
      { kind: "SOMETHING_ELSE", orderNumber: "ORD-1" },
    ]) {
      expect(readNotificationMessage(message)).toBeNull();
    }
  });
});
