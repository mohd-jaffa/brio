import { describe, expect, it } from "vitest";

import type { Order, OrderStatus, PaymentStatus } from "@/features/orders/types";
import {
  balanceDue,
  byDueDate,
  deliveryLabel,
  isOpen,
  isOverdue,
  paymentPill,
  statusPill,
} from "@/features/orders/view";

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
    payment: { status: paymentStatus, paid: 0 },
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
    expect(isOpen(order("5", "READY", now.toISOString()))).toBe(true);
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

describe("statusPill", () => {
  it("says Overdue rather than the status, because that is what needs attention", () => {
    expect(statusPill(order("1", "PENDING", "2026-09-21T10:00:00Z"), now)).toEqual({
      label: "Overdue",
      tone: "cancelled",
    });
  });

  it("otherwise reads the status in the words and tone the constants chose — Completed for a pickup", () => {
    expect(statusPill(order("2", "DELIVERED", "2026-09-21T10:00:00Z"), now)).toEqual({
      label: "Completed",
      tone: "delivered",
    });
    const delivered = order("3", "DELIVERED", "2026-09-21T10:00:00Z");
    delivered.delivery.type = "DELIVERY";
    expect(statusPill(delivered, now).label).toBe("Delivered");
  });
});

describe("paymentPill", () => {
  it("reads the payment status in the same one place", () => {
    expect(paymentPill(order("1", "PENDING", now.toISOString(), "PARTIALLY_PAID"))).toEqual({
      label: "Part paid",
      tone: "pending",
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

describe("balanceDue", () => {
  function owing(status: OrderStatus, paymentStatus: PaymentStatus, total: number, paid: number) {
    const base = order("1", status, now.toISOString(), paymentStatus);
    return { ...base, payment: { status: paymentStatus, paid }, pricing: { ...base.pricing, total } };
  }

  it("is the total less what has been paid", () => {
    expect(balanceDue(owing("PENDING", "PARTIALLY_PAID", 150000, 50000))).toBe(100000);
    expect(balanceDue(owing("PENDING", "UNPAID", 30000, 0))).toBe(30000);
  });

  it("is nothing on a cancelled order", () => {
    expect(balanceDue(owing("CANCELLED", "UNPAID", 30000, 0))).toBe(0);
  });

  it("follows the payments, which are the truth, not the status (§139.11.9)", () => {
    expect(balanceDue(owing("DELIVERED", "PAID", 30000, 30000))).toBe(0);
    expect(balanceDue(owing("DELIVERED", "PAID", 30000, 0))).toBe(30000);
  });

  it("never goes below nothing", () => {
    expect(balanceDue(owing("PENDING", "PARTIALLY_PAID", 30000, 40000))).toBe(0);
  });
});

describe("deliveryLabel", () => {
  it("says how the order is handed over in words, never the stored code", () => {
    const pickup = order("1", "PENDING", now.toISOString());
    expect(deliveryLabel(pickup)).toBe("Pickup");
    expect(deliveryLabel({ ...pickup, delivery: { ...pickup.delivery, type: "DELIVERY" } })).toBe("Delivery");
  });

  it("puts a code this build does not know into words rather than showing it raw", () => {
    const pickup = order("1", "PENDING", now.toISOString());
    const unknown = { ...pickup, delivery: { ...pickup.delivery, type: "SAME_DAY" } } as unknown as Order;
    expect(deliveryLabel(unknown)).toBe("Same day");
  });
});
