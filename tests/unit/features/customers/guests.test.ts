import { describe, expect, it } from "vitest";

import { PAGE_SIZE } from "@/constants/limits";
import { getGuestSales } from "@/features/customers/guests";
import { ORDER_LIST_COLUMNS } from "@/features/orders/list";
import { fakeSupabase, selects } from "@tests/support/supabase";
import { tenantOf } from "@tests/support/tenant";

const now = new Date("2026-09-26T06:00:00Z");

const listRow = (id: string) => ({
  id,
  order_number: `ORD-${id}`,
  status: "PENDING",
  delivery_type: "PICKUP",
  delivery_date: "2026-09-27T05:00:00Z",
  total: 38000,
  payment_status: "PAID",
  created_at: "2026-09-26T05:00:00Z",
  customer_id: null,
  customers: null,
  order_items: [],
});

describe("getGuestSales", () => {
  it("counts and totals the period's Guest orders, cancelled ones left out, and reads the first page", async () => {
    const fake = fakeSupabase((query) => {
      if (query.table === "payments") return { data: [{ order_id: "1", amount: 38000 }] };
      if (selects(query, "id, total"))
        return {
          data: [
            { id: "1", total: 38000 },
            { id: "2", total: 76000 },
          ],
        };
      return { data: [listRow("1")] };
    });
    const sales = await getGuestSales(tenantOf(fake.client), { range: "LAST_7_DAYS" }, now);

    expect(sales).toMatchObject({
      period: { from: "2026-09-20", to: "2026-09-26" },
      orders: 2,
      sales: 114000,
      nextCursor: null,
    });
    expect(sales.items).toEqual([expect.objectContaining({ id: "1", customer: null, balanceDue: 0 })]);

    for (const query of fake.queries.filter((recorded) => recorded.table === "orders")) {
      expect(fake.argsOf(query, "eq")).toEqual([["bakery_id", "b-1"]]);
      expect(fake.argsOf(query, "is")).toEqual([["customer_id", null]]);
      expect(fake.argsOf(query, "neq")).toEqual([["status", "CANCELLED"]]);
      expect(fake.argsOf(query, "gte")).toEqual([["created_at", "2026-09-19T18:30:00.000Z"]]);
      expect(fake.argsOf(query, "lt")).toEqual([["created_at", "2026-09-26T18:30:00.000Z"]]);
    }
    const page = fake.queries.find((query) => selects(query, ORDER_LIST_COLUMNS))!;
    expect(fake.argsOf(page, "order")).toEqual([
      ["created_at", { ascending: false }],
      ["id", { ascending: true }],
    ]);
    expect(fake.argsOf(page, "range")).toEqual([[0, PAGE_SIZE]]);
  });

  it("reads a later page of a custom period, and nothing as none", async () => {
    const fake = fakeSupabase(() => ({ data: null }));
    const sales = await getGuestSales(
      tenantOf(fake.client),
      { range: "CUSTOM", from: "2026-09-01", to: "2026-09-10", cursor: 20 },
      now,
    );
    expect(sales).toEqual({
      period: { from: "2026-09-01", to: "2026-09-10" },
      orders: 0,
      sales: 0,
      items: [],
      nextCursor: null,
    });
    const page = fake.queries.find((query) => selects(query, ORDER_LIST_COLUMNS))!;
    expect(fake.argsOf(page, "range")).toEqual([[20, 20 + PAGE_SIZE]]);
  });

  it("passes on a refusal in the app's own words", async () => {
    const fake = fakeSupabase(() => ({ error: { code: "PGRST000", message: "down" } }));
    await expect(getGuestSales(tenantOf(fake.client), { range: "LAST_30_DAYS" }, now)).rejects.toMatchObject({
      kind: expect.any(String),
    });
  });
});
