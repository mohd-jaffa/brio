import { describe, expect, it } from "vitest";

import { HOME_LIST_LIMITS } from "@/constants/limits";
import { getDashboard } from "@/features/dashboard/api";
import { ORDER_LIST_COLUMNS } from "@/features/orders/list";
import { AppError } from "@/lib/errors/AppError";
import { fakeSupabase, selects, type RecordedQuery } from "@tests/support/supabase";
import { tenantOf } from "@tests/support/tenant";

const now = new Date("2026-09-26T06:00:00Z"); // Saturday, 11:30 in India

const listRow = (id: string, dueAt: string) => ({
  id,
  order_number: `ORD-${id}`,
  status: "PENDING",
  delivery_type: "PICKUP",
  delivery_date: dueAt,
  total: 1000,
  payment_status: "UNPAID",
  created_at: "2026-09-20T05:00:00Z",
  customer_id: null,
  customers: null,
  order_items: [],
});

/** What each of Home's queries finds, told apart by what it asks for. */
function answers(overrides: Partial<Record<string, unknown>> = {}) {
  return (query: RecordedQuery) => {
    const pick = (name: string, fallback: unknown) => ({ data: name in overrides ? overrides[name] : fallback });
    if (query.table === "payments") return pick("payments", [{ order_id: "owing", amount: 400 }]);
    if (query.table === "stock_levels") return pick("ledger", [{ product_id: "p-1", balance: 2, stocked: true }]);
    if (query.table === "products") return pick("products", [{ id: "p-1", name: "Cake", icon_key: null, unit: "piece" }]);
    if (selects(query, ORDER_LIST_COLUMNS)) return pick("due", [listRow("a", "2026-09-25T05:00:00Z"), listRow("b", "2026-09-27T05:00:00Z")]);
    if (selects(query, "id")) return { count: 3 };
    if (selects(query, "id, total"))
      return pick("owing", [
        { id: "owing", total: 1000 },
        { id: "unpaid", total: 250 },
      ]);
    if (selects(query, "created_at, customers(id, name)"))
      return pick("recent", [
        { created_at: "2026-09-26T05:00:00Z", customers: { id: "c-1", name: "Anu" } },
        { created_at: "2026-09-25T05:00:00Z", customers: null },
      ]);
    if (selects(query, "customer_id")) return pick("counts", [{ customer_id: "c-1" }, { customer_id: "c-1" }]);
    return pick("period", [
      { total: 800, status: "PENDING", created_at: "2026-09-26T05:00:00Z", order_items: [] },
      { total: 200, status: "PENDING", created_at: "2026-09-21T05:00:00Z", order_items: [] },
    ]);
  };
}

describe("getDashboard", () => {
  it("works Home out from bounded queries, in the business's calendar", async () => {
    const fake = fakeSupabase(answers());
    const dashboard = await getDashboard(tenantOf(fake.client), { period: "WEEK" }, now);

    expect(dashboard).toMatchObject({
      period: "WEEK",
      dueToday: 3,
      sales: 1000,
      toCollect: 850,
      lowStockCount: 1,
      moreDue: false,
      lowStock: [{ productId: "p-1", balance: 2 }],
      recentCustomers: [{ id: "c-1", name: "Anu", orders: 2 }],
      ordersByStatus: [{ status: "PENDING", count: 2 }],
    });
    expect(dashboard.salesByDay.map((day) => day.day)).toEqual([
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
    ]);
    expect(dashboard.due.map((group) => [group.bucket, group.orders.map((order) => order.id)])).toEqual([
      ["overdue", ["a"]],
      ["tomorrow", ["b"]],
    ]);

    // Every query is kept to the caller's business.
    for (const query of fake.queries) expect(fake.argsOf(query, "eq")).toContainEqual(["bakery_id", "b-1"]);
    // The period is read from the chart's first day, and the due list up to the end of tomorrow.
    const period = fake.queries.find((query) => fake.argsOf(query, "gte").some(([column]) => column === "created_at"));
    expect(fake.argsOf(period!, "gte")).toEqual([["created_at", "2026-09-19T18:30:00.000Z"]]);
    const due = fake.queries.find((query) => selects(query, ORDER_LIST_COLUMNS))!;
    expect(fake.argsOf(due, "lt")).toEqual([["delivery_date", "2026-09-27T18:30:00.000Z"]]);
    expect(fake.argsOf(due, "in")).toEqual([["status", ["PENDING", "IN_PROGRESS", "READY", "IN_TRANSIT"]]]);
    expect(fake.argsOf(due, "limit")).toEqual([[HOME_LIST_LIMITS.due + 1]]);
  });

  it("narrows the orders due by status and payment together (§116)", async () => {
    const fake = fakeSupabase(answers());
    await getDashboard(tenantOf(fake.client), { period: "TODAY", status: "READY", payment: "UNPAID" }, now);
    const due = fake.queries.find((query) => selects(query, ORDER_LIST_COLUMNS))!;
    expect(fake.argsOf(due, "in")).toEqual([["status", ["READY"]]]);
    expect(fake.argsOf(due, "eq")).toContainEqual(["payment_status", "UNPAID"]);
  });

  it("says when more are due than it shows", async () => {
    const many = Array.from({ length: HOME_LIST_LIMITS.due + 1 }, (_, index) => listRow(`o${index}`, "2026-09-26T05:00:00Z"));
    const dashboard = await getDashboard(tenantOf(fakeSupabase(answers({ due: many })).client), { period: "TODAY" }, now);
    expect(dashboard.moreDue).toBe(true);
    expect(dashboard.due[0].orders).toHaveLength(HOME_LIST_LIMITS.due);
  });

  it("asks nothing more about customers when nobody has ordered", async () => {
    const fake = fakeSupabase(answers({ recent: [] }));
    const dashboard = await getDashboard(tenantOf(fake.client), { period: "TODAY" }, now);
    expect(dashboard.recentCustomers).toEqual([]);
    expect(fake.queries.some((query) => selects(query, "customer_id"))).toBe(false);
  });

  it("reads an empty answer as none", async () => {
    const fake = fakeSupabase((query) => (selects(query, "id") ? { count: null } : { data: null }));
    const dashboard = await getDashboard(tenantOf(fake.client), { period: "TODAY" }, now);
    expect(dashboard).toMatchObject({ dueToday: 0, sales: 0, toCollect: 0, due: [], lowStock: [] });
  });

  it("turns a database failure into the app's own error", async () => {
    const failing = fakeSupabase(() => ({ error: { message: "boom", code: "XX000" } }));
    await expect(getDashboard(tenantOf(failing.client), { period: "TODAY" }, now)).rejects.toBeInstanceOf(AppError);

    const countFails = fakeSupabase((query) => (selects(query, "id") ? { error: { message: "boom", code: "XX000" } } : { data: [] }));
    await expect(getDashboard(tenantOf(countFails.client), { period: "TODAY" }, now)).rejects.toBeInstanceOf(AppError);
  });
});
