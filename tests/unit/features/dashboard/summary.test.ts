import { describe, expect, it } from "vitest";

import type { InventoryBalance } from "@/features/inventory/types";
import type { Order, OrderStatus, PaymentStatus } from "@/features/orders/types";
import type { Product } from "@/features/products/types";

import { lowStock, ordersByDue, summarise } from "@/features/dashboard/summary";

const now = new Date("2026-09-22T06:00:00Z"); // 11:30 in India

function order(
  id: string,
  {
    status = "PENDING" as OrderStatus,
    payment = "UNPAID" as PaymentStatus,
    paid = 0,
    total = 10000,
    due = "2026-09-22T12:00:00Z",
    createdAt = "2026-09-22T05:00:00Z",
  } = {},
): Order {
  return {
    id,
    customerId: "c-1",
    orderNumber: `#${id}`,
    status,
    payment: { status: payment, paid },
    pricing: { subtotal: total, discount: 0, deliveryCharge: 0, tax: 0, total },
    delivery: { type: "PICKUP", date: due },
    items: [],
    adjustments: [],
    createdAt,
    updatedAt: createdAt,
  };
}

function product(id: string, isActive = true): Product {
  return {
    id,
    name: `Product ${id}`,
    defaultPrice: 10000,
    unit: "piece",
    isActive,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

describe("summarise", () => {
  it("counts what was taken today, in the bakery's own day", () => {
    const summary = summarise(
      [
        order("today", { total: 50000 }),
        order("yesterday", { createdAt: "2026-09-20T05:00:00Z", total: 90000 }),
      ],
      now,
    );

    expect(summary.todaysOrders).toBe(1);
    expect(summary.todaysRevenue).toBe(50000);
  });

  it("leaves a cancelled order out of today's trading", () => {
    const summary = summarise([order("x", { status: "CANCELLED", total: 50000 })], now);
    expect(summary.todaysOrders).toBe(0);
    expect(summary.todaysRevenue).toBe(0);
  });

  it("counts every order still being worked on", () => {
    const summary = summarise(
      [
        order("a", { status: "PENDING" }),
        order("b", { status: "IN_PROGRESS" }),
        order("c", { status: "DELIVERED" }),
      ],
      now,
    );
    expect(summary.pendingOrders).toBe(2);
  });

  it("adds up what is still owed, ignoring cancelled orders", () => {
    const summary = summarise(
      [
        order("a", { payment: "UNPAID", total: 30000 }),
        order("b", { payment: "PARTIALLY_PAID", total: 20000 }),
        order("c", { payment: "PAID", total: 99000 }),
        order("d", { payment: "UNPAID", status: "CANCELLED", total: 99000 }),
      ],
      now,
    );
    expect(summary.pendingPayments).toBe(50000);
  });

  it("takes what has been paid off a part-paid order", () => {
    const summary = summarise(
      [
        order("a", { payment: "PARTIALLY_PAID", total: 150000, paid: 50000 }),
        order("b", { payment: "UNPAID", total: 30000 }),
      ],
      now,
    );
    expect(summary.pendingPayments).toBe(130000);
  });

  it("is all zeroes for a bakery with no orders", () => {
    expect(summarise([], now)).toEqual({
      todaysOrders: 0,
      todaysRevenue: 0,
      pendingOrders: 0,
      pendingPayments: 0,
    });
  });
});

describe("ordersByDue", () => {
  it("groups what is open by when it is due, overdue first", () => {
    const groups = ordersByDue(
      [
        order("later", { due: "2026-09-30T10:00:00Z" }),
        order("tomorrow", { due: "2026-09-23T10:00:00Z" }),
        order("today", { due: "2026-09-22T12:00:00Z" }),
        order("late", { due: "2026-09-21T10:00:00Z" }),
      ],
      now,
    );

    expect(groups.map((group) => group.bucket)).toEqual(["overdue", "today", "tomorrow", "later"]);
    expect(groups[0].orders.map((entry) => entry.id)).toEqual(["late"]);
  });

  it("leaves out a group with nothing in it", () => {
    const groups = ordersByDue([order("today", { due: "2026-09-22T12:00:00Z" })], now);
    expect(groups.map((group) => group.bucket)).toEqual(["today"]);
  });

  it("leaves out orders that are finished", () => {
    expect(ordersByDue([order("done", { status: "DELIVERED" })], now)).toEqual([]);
  });
});

describe("lowStock", () => {
  const balances: InventoryBalance[] = [
    { productId: "a", balance: 2 },
    { productId: "b", balance: 40 },
  ];

  it("names what is at or below the mark, emptiest first", () => {
    const low = lowStock([product("a"), product("b"), product("c")], balances);

    // c has never moved, so it is at zero.
    expect(low.map((line) => line.product.id)).toEqual(["c", "a"]);
    expect(low[0].balance).toBe(0);
  });

  it("says nothing about a product that is not on sale", () => {
    expect(lowStock([product("c", false)], balances)).toEqual([]);
  });

  it("is empty when everything is well stocked", () => {
    expect(lowStock([product("b")], balances)).toEqual([]);
  });
});
