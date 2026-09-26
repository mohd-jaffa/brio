import { describe, expect, it } from "vitest";

import { API_MAX_ROWS } from "@/constants/limits";
import { getAnalytics } from "@/features/analytics/api";
import { AppError } from "@/lib/errors/AppError";
import { fakeSupabase } from "@tests/support/supabase";
import { tenantOf } from "@tests/support/tenant";

const now = new Date("2026-09-26T06:00:00Z");

const anOrder = (created_at: string, total: number) => ({
  total,
  status: "DELIVERED",
  created_at,
  delivery_type: "PICKUP",
  customer_id: null,
  customers: null,
  order_items: [],
  payments: [{ amount: total }],
});

describe("getAnalytics", () => {
  it("reads both periods at once and sums each on the server", async () => {
    const fake = fakeSupabase((query) =>
      query.table === "orders"
        ? { data: [anOrder("2026-09-10T05:00:00Z", 3000), anOrder("2026-08-10T05:00:00Z", 2000)] }
        : { data: [{ created_at: "2026-09-12T05:00:00Z" }, { created_at: "2026-08-12T05:00:00Z" }, { created_at: "2026-08-13T05:00:00Z" }] },
    );
    const report = await getAnalytics(tenantOf(fake.client), { range: "THIS_MONTH" }, now);

    expect(report.period).toEqual({ from: "2026-09-01", to: "2026-09-26" });
    expect(report.previous).toEqual({ from: "2026-08-01", to: "2026-08-26" });
    expect(report.interval).toBe("DAY");
    expect(report.kpis.sales).toEqual({ value: 3000, previous: 2000 });
    expect(report.kpis.newCustomers).toEqual({ value: 1, previous: 2 });
    expect(report.salesTrend[9]).toEqual({ start: "2026-09-10", value: 3000, previous: 2000 });
    expect(report.ordersTrend[9]).toEqual({ start: "2026-09-10", value: 1 });
    expect(report.guestSplit).toEqual({ guest: 3000, customers: 0 });
    expect(report.collection).toEqual({ collected: 3000, toCollect: 0 });
    expect(report.handover).toEqual({ pickup: 1, delivery: 0 });

    for (const query of fake.queries) {
      expect(fake.argsOf(query, "eq")).toContainEqual(["bakery_id", "b-1"]);
      expect(fake.argsOf(query, "gte")).toEqual([["created_at", "2026-07-31T18:30:00.000Z"]]);
      expect(fake.argsOf(query, "lt")).toEqual([["created_at", "2026-09-26T18:30:00.000Z"]]);
      // A window at a time: a year and the year before can pass the API's row limit.
      expect(fake.argsOf(query, "order")).toEqual([["id", { ascending: true }]]);
      expect(fake.argsOf(query, "range")).toEqual([[0, API_MAX_ROWS - 1]]);
    }
  });

  it("takes a custom period and the grouping asked for", async () => {
    const fake = fakeSupabase(() => ({ data: null }));
    const report = await getAnalytics(
      tenantOf(fake.client),
      { range: "CUSTOM", from: "2026-09-01", to: "2026-09-14", interval: "WEEK" },
      now,
    );
    expect(report.previous).toEqual({ from: "2026-08-18", to: "2026-08-31" });
    expect(report.salesTrend.map((group) => group.start)).toEqual(["2026-09-01", "2026-09-08"]);
    expect(report.products).toEqual([]);
  });

  it("turns a database failure into the app's own error", async () => {
    const fake = fakeSupabase(() => ({ error: { message: "boom", code: "XX000" } }));
    await expect(getAnalytics(tenantOf(fake.client), { range: "LAST_7_DAYS" }, now)).rejects.toBeInstanceOf(AppError);
  });
});
