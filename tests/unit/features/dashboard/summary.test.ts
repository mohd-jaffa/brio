import { describe, expect, it } from "vitest";

import { HOME_LIST_LIMITS } from "@/constants/limits";
import {
  groupDue,
  lowStock,
  ordersByStatus,
  periodDays,
  periodSales,
  recentCustomers,
  salesByDay,
  topProducts,
  type PeriodOrder,
} from "@/features/dashboard/summary";
import type { OrderListItem } from "@/features/orders/types";

const item = (
  productId: string | null,
  name: string,
  quantity: number,
  subtotal: number,
  iconKey: string | null = null,
) => ({
  product_id: productId,
  product_name: name,
  quantity,
  subtotal,
  products: productId ? { icon_key: iconKey } : null,
});

// 26 Sep 2026 is a Saturday. Times are in India: 10:00 IST is 04:30Z.
const orders: PeriodOrder[] = [
  {
    total: 1000,
    status: "DELIVERED",
    created_at: "2026-09-26T04:30:00Z",
    order_items: [item("p-cake", "Cake", 1, 1000, "cake")],
  },
  {
    total: 500,
    status: "PENDING",
    created_at: "2026-09-25T20:00:00Z",
    order_items: [item("p-cake", "Cake", 1, 500, "cake")],
  }, // 26 Sep 01:30 IST
  {
    total: 700,
    status: "CANCELLED",
    created_at: "2026-09-26T05:00:00Z",
    order_items: [item("p-bread", "Bread", 5, 700)],
  },
  {
    total: 300,
    status: "IN_PROGRESS",
    created_at: "2026-09-22T05:00:00Z",
    order_items: [item(null, "Topper", 2, 200), item(null, "Card", 1, 100)],
  },
  {
    total: 900,
    status: "PENDING",
    created_at: "2026-09-02T05:00:00Z",
    order_items: [item("p-bread", "Bread", 3, 900)],
  },
];

describe("periodDays", () => {
  it("starts today, this week's Monday or this month's first", () => {
    expect(periodDays("TODAY", "2026-09-26").start).toBe("2026-09-26");
    expect(periodDays("WEEK", "2026-09-26").start).toBe("2026-09-21");
    expect(periodDays("MONTH", "2026-09-26").start).toBe("2026-09-01");
  });

  it("draws at least the last week, so today alone is still a trend", () => {
    expect(periodDays("TODAY", "2026-09-26").chartStart).toBe("2026-09-20");
    expect(periodDays("WEEK", "2026-09-22").chartStart).toBe("2026-09-16");
    expect(periodDays("MONTH", "2026-09-26").chartStart).toBe("2026-09-01");
  });
});

describe("periodSales", () => {
  it("adds up what was placed from the start in India, cancelled orders left out", () => {
    expect(periodSales(orders, "2026-09-26")).toBe(1500);
    expect(periodSales(orders, "2026-09-21")).toBe(1800);
  });
});

describe("salesByDay", () => {
  it("gives every day its total, a quiet day nothing, and ignores days outside", () => {
    expect(salesByDay(orders, ["2026-09-25", "2026-09-26"])).toEqual([
      { day: "2026-09-25", total: 0 },
      { day: "2026-09-26", total: 1500 },
    ]);
  });
});

describe("topProducts", () => {
  it("ranks what sold by what it took, with custom items as one line", () => {
    expect(topProducts(orders, "2026-09-21")).toEqual([
      { productId: "p-cake", name: "Cake", iconKey: "cake", quantity: 2, sales: 1500 },
      { productId: null, name: "Custom items", iconKey: null, quantity: 3, sales: 300 },
    ]);
  });

  it("breaks a tie on what it took by how many, then by name", () => {
    const tied: PeriodOrder[] = [
      {
        total: 0,
        status: "PENDING",
        created_at: "2026-09-26T05:00:00Z",
        order_items: [item("a", "Bun", 1, 100), item("b", "Apple", 1, 100), item("c", "Cookie", 3, 100)],
      },
    ];
    expect(topProducts(tied, "2026-09-26").map((line) => line.name)).toEqual(["Cookie", "Apple", "Bun"]);
  });

  it("keeps to the top few", () => {
    const many: PeriodOrder[] = [
      {
        total: 0,
        status: "PENDING",
        created_at: "2026-09-26T05:00:00Z",
        order_items: Array.from({ length: 8 }, (_, index) => item(`p-${index}`, `P${index}`, 1, index)),
      },
    ];
    expect(topProducts(many, "2026-09-26")).toHaveLength(HOME_LIST_LIMITS.topProducts);
  });
});

describe("ordersByStatus", () => {
  it("counts the period's orders at each status, in order, leaving out a status with none", () => {
    expect(ordersByStatus(orders, "2026-09-21")).toEqual([
      { status: "PENDING", count: 1 },
      { status: "IN_PROGRESS", count: 1 },
      { status: "DELIVERED", count: 1 },
      { status: "CANCELLED", count: 1 },
    ]);
  });
});

describe("groupDue", () => {
  const due = (id: string, dueAt: string) => ({ id, dueAt }) as OrderListItem;
  const now = new Date("2026-09-26T06:00:00Z"); // 11:30 in India

  it("groups by day — an order due earlier today is still today (IMP-05)", () => {
    const groups = groupDue(
      [
        due("late", "2026-09-25T05:00:00Z"),
        due("earlier", "2026-09-26T03:00:00Z"),
        due("next", "2026-09-27T05:00:00Z"),
      ],
      now,
    );
    expect(groups.map((group) => [group.bucket, group.orders.map((order) => order.id)])).toEqual([
      ["overdue", ["late"]],
      ["today", ["earlier"]],
      ["tomorrow", ["next"]],
    ]);
  });

  it("leaves out an empty group", () => {
    expect(groupDue([due("next", "2026-09-27T05:00:00Z")], now).map((group) => group.bucket)).toEqual(["tomorrow"]);
  });
});

describe("lowStock", () => {
  const products = [
    { id: "p-cake", name: "Cake", icon_key: "cake", unit: "piece" },
    { id: "p-bun", name: "Bun", icon_key: null, unit: "piece" },
    { id: "p-bread", name: "Bread", icon_key: null, unit: "piece" },
    { id: "p-flour", name: "Flour", icon_key: null, unit: "kg" },
    { id: "p-never", name: "Never counted", icon_key: null, unit: "piece" },
    { id: "p-new", name: "No lines yet", icon_key: null, unit: "piece" },
  ];

  it("lists stocked products at or under the mark, emptiest first, names breaking a tie", () => {
    // As `stock_levels` (0019) adds them up; a product with no movements has no row.
    const levels = [
      { product_id: "p-cake", balance: 3, stocked: true },
      { product_id: "p-bun", balance: 3, stocked: true },
      { product_id: "p-bread", balance: 3, stocked: true },
      { product_id: "p-flour", balance: 50, stocked: true },
      { product_id: "p-never", balance: -2, stocked: false },
    ];
    expect(lowStock(levels, products)).toEqual([
      { productId: "p-bread", name: "Bread", iconKey: null, unit: "piece", balance: 3 },
      { productId: "p-bun", name: "Bun", iconKey: null, unit: "piece", balance: 3 },
      { productId: "p-cake", name: "Cake", iconKey: "cake", unit: "piece", balance: 3 },
    ]);
  });
});

describe("recentCustomers", () => {
  it("lists each customer once, newest first, with their order count, and skips guests", () => {
    const rows = [
      { created_at: "2026-09-26T05:00:00Z", customers: { id: "c-1", name: "Anu" } },
      { created_at: "2026-09-26T04:00:00Z", customers: null },
      { created_at: "2026-09-25T05:00:00Z", customers: { id: "c-2", name: "Rahul" } },
      { created_at: "2026-09-24T05:00:00Z", customers: { id: "c-1", name: "Anu" } },
    ];
    expect(recentCustomers(rows, new Map([["c-1", 4]]))).toEqual([
      { id: "c-1", name: "Anu", orders: 4, lastOrderAt: "2026-09-26T05:00:00Z" },
      { id: "c-2", name: "Rahul", orders: 0, lastOrderAt: "2026-09-25T05:00:00Z" },
    ]);
  });

  it("stops at the few Home shows", () => {
    const rows = Array.from({ length: 9 }, (_, index) => ({
      created_at: "2026-09-26T05:00:00Z",
      customers: { id: `c-${index}`, name: `C${index}` },
    }));
    expect(recentCustomers(rows, new Map())).toHaveLength(HOME_LIST_LIMITS.recentCustomers);
  });
});
