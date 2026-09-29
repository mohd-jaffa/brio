import { describe, expect, it } from "vitest";

import {
  collection,
  counted,
  customerMix,
  guestSplit,
  handover,
  headlineFigures,
  percentChange,
  placedIn,
  productSales,
  salesTrend,
  statusCounts,
  TOP_CUSTOMERS,
  topCustomers,
  trend,
  type ReportOrder,
} from "@/features/analytics/summary";

const september = { from: "2026-09-01", to: "2026-09-30" };
const august = { from: "2026-08-01", to: "2026-08-31" };

const line = (productId: string | null, name: string, quantity: number, subtotal: number) => ({
  product_id: productId,
  product_name: name,
  quantity,
  subtotal,
  products: productId ? { icon_key: `${name.toLowerCase()}-icon` } : null,
});

function order(changes: Partial<ReportOrder> = {}): ReportOrder {
  return {
    total: 1000,
    status: "DELIVERED",
    created_at: "2026-09-10T05:00:00Z",
    delivery_type: "DELIVERY",
    customer_id: "c-1",
    customers: { id: "c-1", name: "Anu", created_at: "2026-09-05T05:00:00Z" },
    order_items: [line("p-cake", "Cake", 1, 1000)],
    payments: [],
    ...changes,
  };
}

const guest = { customer_id: null, customers: null };

describe("placedIn and counted", () => {
  it("keeps the orders placed in the period by India's calendar, and leaves out the cancelled", () => {
    const late = order({ created_at: "2026-08-31T19:00:00Z" }); // 1 Sep, 00:30 in India
    const early = order({ created_at: "2026-08-31T17:00:00Z" }); // 31 Aug, 22:30
    expect(placedIn([late, early], september)).toEqual([late]);
    expect(counted([order(), order({ status: "CANCELLED" })])).toHaveLength(1);
  });
});

describe("headlineFigures and percentChange", () => {
  it("gives each figure beside the period before's, the cancelled left out", () => {
    const figures = headlineFigures(
      [order({ total: 3000 }), order({ total: 1000 }), order({ status: "CANCELLED", total: 9000 })],
      [order({ total: 2000 })],
      { value: 2, previous: 1 },
    );
    expect(figures).toEqual({
      sales: { value: 4000, previous: 2000 },
      orders: { value: 2, previous: 1 },
      newCustomers: { value: 2, previous: 1 },
      averageOrder: { value: 2000, previous: 2000 },
    });
  });

  it("averages nothing to nothing", () => {
    expect(headlineFigures([], [], { value: 0, previous: 0 }).averageOrder).toEqual({ value: 0, previous: 0 });
  });

  it("says how a figure moved in whole percent, and nothing when there was nothing before", () => {
    expect(percentChange({ value: 112, previous: 100 })).toBe(12);
    expect(percentChange({ value: 50, previous: 200 })).toBe(-75);
    expect(percentChange({ value: 5, previous: 0 })).toBeUndefined();
  });
});

describe("trend and salesTrend", () => {
  it("sums into each group of the period, skipping what falls outside", () => {
    const orders = [
      order({ created_at: "2026-09-01T05:00:00Z", total: 100 }),
      order({ created_at: "2026-09-09T05:00:00Z", total: 200 }),
      order({ created_at: "2026-10-09T05:00:00Z", total: 999 }),
    ];
    const week = { from: "2026-09-01", to: "2026-09-14" };
    expect(trend(orders, week, "WEEK", (entry) => entry.total)).toEqual([
      { start: "2026-09-01", value: 100 },
      { start: "2026-09-08", value: 200 },
    ]);
  });

  it("puts the period before's group beside each, and nothing where it had none", () => {
    const current = [
      order({ created_at: "2026-09-02T05:00:00Z", total: 500 }),
      order({ created_at: "2026-09-30T05:00:00Z", status: "CANCELLED" }),
    ];
    const before = [order({ created_at: "2026-08-02T05:00:00Z", total: 300 })];
    const groups = salesTrend(current, before, september, { from: "2026-08-01", to: "2026-08-29" }, "DAY");
    expect(groups[1]).toEqual({ start: "2026-09-02", value: 500, previous: 300 });
    expect(groups[29]).toEqual({ start: "2026-09-30", value: 0, previous: 0 });
  });
});

describe("productSales", () => {
  it("ranks every product by what it took, counting each order once, with custom items as one line", () => {
    const orders = [
      order({
        order_items: [line("p-cake", "Cake", 2, 2000), line("p-cake", "Cake", 1, 1000), line(null, "Topper", 1, 150)],
      }),
      order({ order_items: [line("p-bun", "Bun", 6, 600), line(null, "Card", 2, 100)] }),
      order({ status: "CANCELLED", order_items: [line("p-bun", "Bun", 50, 5000)] }),
    ];
    expect(productSales(orders)).toEqual([
      { productId: "p-cake", name: "Cake", iconKey: "cake-icon", orders: 1, quantity: 3, sales: 3000 },
      { productId: "p-bun", name: "Bun", iconKey: "bun-icon", orders: 1, quantity: 6, sales: 600 },
      { productId: null, name: "Custom items", iconKey: null, orders: 2, quantity: 3, sales: 250 },
    ]);
  });

  it("breaks a tie on what it took by how many, then by name", () => {
    const orders = [
      order({ order_items: [line("b", "Bun", 1, 100), line("a", "Apple", 1, 100), line("c", "Cookie", 4, 100)] }),
    ];
    expect(productSales(orders).map((entry) => entry.name)).toEqual(["Cookie", "Apple", "Bun"]);
  });
});

describe("the splits", () => {
  const orders = [
    order({ status: "PENDING", delivery_type: "PICKUP", total: 1000, payments: [{ amount: 400 }] }),
    order({ ...guest, total: 500, payments: [{ amount: 500 }, { amount: 100 }] }),
    order({ status: "CANCELLED", total: 9000 }),
  ];

  it("counts every status in order, the cancelled too", () => {
    expect(statusCounts(orders)).toEqual([
      { status: "PENDING", count: 1 },
      { status: "DELIVERED", count: 1 },
      { status: "CANCELLED", count: 1 },
    ]);
  });

  it("counts pickups against deliveries", () => {
    expect(handover(orders)).toEqual({ pickup: 1, delivery: 1 });
  });

  it("splits sales between Guests and saved customers", () => {
    expect(guestSplit(orders)).toEqual({ guest: 500, customers: 1000 });
  });

  it("splits sales between what was paid and what is owed, an overpayment counting only to the total", () => {
    expect(collection(orders)).toEqual({ collected: 900, toCollect: 600 });
  });
});

describe("the customers", () => {
  it("counts each customer who ordered once, as new when added in the period", () => {
    const orders = [
      order(),
      order(),
      order({ customer_id: "c-2", customers: { id: "c-2", name: "Rahul", created_at: "2026-07-01T05:00:00Z" } }),
      order(guest),
    ];
    expect(customerMix(orders, september)).toEqual({ new: 1, returning: 1 });
    expect(customerMix(orders, august)).toEqual({ new: 0, returning: 2 });
  });

  it("ranks who spent most, then who ordered most, then by name — no Guests", () => {
    const rahul = { customer_id: "c-2", customers: { id: "c-2", name: "Rahul", created_at: "2026-07-01T05:00:00Z" } };
    const bina = { customer_id: "c-3", customers: { id: "c-3", name: "Bina", created_at: "2026-07-01T05:00:00Z" } };
    const orders = [
      order({ total: 500 }),
      order({ total: 500 }),
      order({ ...rahul, total: 1000 }),
      order({ ...bina, total: 1000 }),
      order({ ...guest, total: 99999 }),
    ];
    expect(topCustomers(orders)).toEqual([
      { id: "c-1", name: "Anu", orders: 2, spent: 1000 },
      { id: "c-3", name: "Bina", orders: 1, spent: 1000 },
      { id: "c-2", name: "Rahul", orders: 1, spent: 1000 },
    ]);
  });

  it("keeps to the top few", () => {
    const many = Array.from({ length: TOP_CUSTOMERS + 3 }, (_, index) =>
      order({
        customer_id: `c-${index}`,
        customers: { id: `c-${index}`, name: `C${index}`, created_at: "2026-09-01T05:00:00Z" },
      }),
    );
    expect(topCustomers(many)).toHaveLength(TOP_CUSTOMERS);
  });
});
