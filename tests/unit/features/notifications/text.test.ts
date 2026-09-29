import { describe, expect, it } from "vitest";

import {
  notificationKind,
  notificationLink,
  notificationText,
  readNotificationMessage,
  type NotificationMessage,
} from "@/features/notifications/text";

const placed: NotificationMessage = {
  kind: "ORDER_PLACED",
  orderId: "o-1",
  orderNumber: "ORD-1028",
  customerName: "Priya Menon",
};
const status: NotificationMessage = {
  kind: "ORDER_STATUS",
  orderId: "o-1",
  orderNumber: "ORD-1028",
  status: "IN_PROGRESS",
  deliveryType: "DELIVERY",
};
const payment: NotificationMessage = {
  kind: "PAYMENT_RECEIVED",
  orderId: "o-1",
  orderNumber: "ORD-1028",
  amount: 50000,
};
const customer: NotificationMessage = { kind: "CUSTOMER_ADDED", customerId: "c-1", name: "Neha Suresh" };
const stock: NotificationMessage = {
  kind: "STOCK_LOW",
  productId: "p-1",
  productName: "Brownies",
  balance: 3,
  unit: "box",
};
const due: NotificationMessage = {
  kind: "ORDER_DUE",
  orderId: "o-1",
  orderNumber: "ORD-1028",
  customerName: "Priya Menon",
  day: "TOMORROW",
};
const overdue: NotificationMessage = {
  kind: "ORDER_OVERDUE",
  orderId: "o-1",
  orderNumber: "ORD-1028",
  customerName: null,
  dueDate: "2026-09-25",
};

describe("notificationText (BUG-26)", () => {
  it("names a status in words, and a finished pickup Completed", () => {
    expect(notificationText(status)).toEqual({ title: "Order updated", body: "ORD-1028 is now Preparing." });
    expect(notificationText({ ...status, status: "DELIVERED", deliveryType: "PICKUP" }).body).toBe(
      "ORD-1028 is now Completed.",
    );
  });

  it("writes an amount in rupees, never paise", () => {
    expect(notificationText(payment)).toEqual({ title: "Payment received", body: "₹500 received for ORD-1028." });
  });

  it("says whom a new order is for, a guest's as the bill does", () => {
    expect(notificationText(placed)).toEqual({ title: "New order", body: "ORD-1028 placed for Priya Menon." });
    expect(notificationText({ ...placed, customerName: null }).body).toBe("ORD-1028 placed for Guest.");
  });

  it("names a new customer, and what is left of a product running low, in its unit", () => {
    expect(notificationText(customer)).toEqual({ title: "New customer", body: "Neha Suresh joined your customers." });
    expect(notificationText(stock)).toEqual({ title: "Low stock", body: "Brownies is down to 3 boxes." });
    expect(notificationText({ ...stock, balance: 1 }).body).toBe("Brownies is down to 1 box.");
  });
});

describe("notificationText for an order's day (0023)", () => {
  it("says an order is due today or tomorrow, and whose it is", () => {
    expect(notificationText(due)).toEqual({ title: "Due soon", body: "ORD-1028 for Priya Menon is due tomorrow." });
    expect(notificationText({ ...due, day: "TODAY" }).body).toBe("ORD-1028 for Priya Menon is due today.");
  });

  it("says an overdue order was due, and on which day", () => {
    expect(notificationText(overdue)).toEqual({ title: "Overdue", body: "ORD-1028 for Guest was due on 25 Sep." });
  });
});

describe("notificationKind", () => {
  it("files each under the inbox's kind: orders, payments, customers, stock", () => {
    expect([placed, status, due, overdue, payment, customer, stock].map(notificationKind)).toEqual([
      "ORDER",
      "ORDER",
      "ORDER",
      "ORDER",
      "PAYMENT",
      "CUSTOMER",
      "STOCK",
    ]);
  });
});

describe("notificationLink", () => {
  it("leads to the order, the customer or the stock list", () => {
    expect(notificationLink(placed)).toBe("/orders/o-1");
    expect(notificationLink(due)).toBe("/orders/o-1");
    expect(notificationLink(overdue)).toBe("/orders/o-1");
    expect(notificationLink(payment)).toBe("/orders/o-1");
    expect(notificationLink(customer)).toBe("/customers/c-1");
    expect(notificationLink(stock)).toBe("/inventory");
  });

  it("leads nowhere from a job queued before it carried the order's id", () => {
    expect(notificationLink({ kind: "PAYMENT_RECEIVED", orderNumber: "ORD-1", amount: 500 })).toBeNull();
  });
});

describe("readNotificationMessage", () => {
  it("reads every message the app queues", () => {
    expect(readNotificationMessage({ ...status, extra: true })).toEqual(status);
    expect(readNotificationMessage(payment)).toEqual(payment);
    expect(readNotificationMessage(placed)).toEqual(placed);
    expect(readNotificationMessage({ ...placed, customerName: null })).toEqual({ ...placed, customerName: null });
    expect(readNotificationMessage(customer)).toEqual(customer);
    expect(readNotificationMessage(stock)).toEqual(stock);
    expect(readNotificationMessage(due)).toEqual(due);
    expect(readNotificationMessage({ ...due, customerName: null, day: "TODAY" })).toEqual({
      ...due,
      customerName: null,
      day: "TODAY",
    });
    expect(readNotificationMessage(overdue)).toEqual(overdue);
  });

  it("reads a status or payment queued before the order's id was carried", () => {
    expect(
      readNotificationMessage({ kind: "ORDER_STATUS", orderNumber: "ORD-1", status: "READY", deliveryType: "PICKUP" }),
    ).toEqual({
      kind: "ORDER_STATUS",
      orderNumber: "ORD-1",
      status: "READY",
      deliveryType: "PICKUP",
    });
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
      { kind: "ORDER_PLACED", orderNumber: "ORD-1" },
      { kind: "CUSTOMER_ADDED", customerId: "c-1" },
      { kind: "CUSTOMER_ADDED", name: "Neha" },
      { kind: "STOCK_LOW", productId: "p-1", productName: "Brownies", balance: 2.5, unit: "box" },
      { kind: "STOCK_LOW", productId: "p-1", productName: "", balance: 2, unit: "box" },
      { kind: "STOCK_LOW", productId: "p-1", productName: "Brownies", balance: 2 },
      { kind: "ORDER_DUE", orderNumber: "ORD-1", day: "TOMORROW" },
      { kind: "ORDER_DUE", orderId: "o-1", orderNumber: "ORD-1", day: "NEXT_WEEK" },
      { kind: "ORDER_OVERDUE", orderId: "o-1", orderNumber: "ORD-1", dueDate: "yesterday" },
      { kind: "ORDER_OVERDUE", orderId: "o-1", orderNumber: "ORD-1" },
      { kind: "SOMETHING_ELSE", orderNumber: "ORD-1" },
    ]) {
      expect(readNotificationMessage(message)).toBeNull();
    }
  });
});
