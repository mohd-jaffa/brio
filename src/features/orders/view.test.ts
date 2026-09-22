import { describe, expect, it } from "vitest";

import type { Order, OrderStatus, PaymentStatus } from "./types";
import { byDueDate, isOpen, isOverdue, paymentBadge, statusBadge } from "./view";

function order(
  id: string,
  status: OrderStatus,
  due: string,
  paymentStatus: PaymentStatus = "UNPAID",
): Order {
  return {
    id,
    customerId: "c-1",
    orderNumber: `#${id}`,
    status,
    payment: { status: paymentStatus },
    pricing: { subtotal: 0, discount: 0, deliveryCharge: 0, tax: 0, total: 0 },
    delivery: { type: "PICKUP", date: due },
    items: [],
    adjustments: [],
    createdAt: "2026-09-20T00:00:00.000Z",
    updatedAt: "2026-09-20T00:00:00.000Z",
  };
}

const now = new Date("2026-09-22T06:00:00Z");

describe("isOpen", () => {
  it("counts an order still being worked on", () => {
    expect(isOpen(order("1", "PENDING", now.toISOString()))).toBe(true);
    expect(isOpen(order("2", "IN_TRANSIT", now.toISOString()))).toBe(true);
  });

  it("does not count one that is finished either way", () => {
    expect(isOpen(order("3", "DELIVERED", now.toISOString()))).toBe(false);
    expect(isOpen(order("4", "CANCELLED", now.toISOString()))).toBe(false);
  });
});

describe("isOverdue", () => {
  it("is late when it is still open and the time has passed", () => {
    expect(isOverdue(order("1", "PENDING", "2026-09-21T10:00:00Z"), now)).toBe(true);
  });

  it("is never late once it is delivered or cancelled", () => {
    expect(isOverdue(order("2", "DELIVERED", "2026-09-21T10:00:00Z"), now)).toBe(false);
    expect(isOverdue(order("3", "CANCELLED", "2026-09-21T10:00:00Z"), now)).toBe(false);
  });

  it("is not late while the time is still to come", () => {
    expect(isOverdue(order("4", "PENDING", "2026-09-23T10:00:00Z"), now)).toBe(false);
  });
});

describe("statusBadge", () => {
  it("says Overdue rather than the status, because that is what needs attention", () => {
    expect(statusBadge(order("1", "PENDING", "2026-09-21T10:00:00Z"), now)).toEqual({
      label: "Overdue",
      tone: "danger",
    });
  });

  it("otherwise reads the status in the words and tone the constants chose", () => {
    expect(statusBadge(order("2", "DELIVERED", "2026-09-21T10:00:00Z"), now)).toEqual({
      label: "Delivered",
      tone: "success",
    });
  });
});

describe("paymentBadge", () => {
  it("reads the payment status in the same one place", () => {
    expect(paymentBadge(order("1", "PENDING", now.toISOString(), "PARTIALLY_PAID"))).toEqual({
      label: "Part paid",
      tone: "warning",
    });
  });
});

describe("byDueDate", () => {
  const orders = [
    order("late", "PENDING", "2026-09-25T10:00:00Z"),
    order("soon", "PENDING", "2026-09-23T10:00:00Z"),
  ];

  it("puts what is due soonest first for open orders", () => {
    expect(byDueDate(orders, true).map((entry) => entry.id)).toEqual(["soon", "late"]);
  });

  it("puts the most recent first for finished ones", () => {
    expect(byDueDate(orders, false).map((entry) => entry.id)).toEqual(["late", "soon"]);
  });

  it("does not disturb the list it was given", () => {
    const original = [...orders];
    byDueDate(orders, true);
    expect(orders).toEqual(original);
  });
});
