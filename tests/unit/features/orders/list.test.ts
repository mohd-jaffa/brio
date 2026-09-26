import { describe, expect, it } from "vitest";

import { toOrderListItem, toOrderListItems, type OrderListRow } from "@/features/orders/list";
import { fakeSupabase } from "@tests/support/supabase";
import { tenantOf } from "@tests/support/tenant";

const row = (overrides: Partial<OrderListRow> = {}): OrderListRow => ({
  id: "o-1",
  order_number: "ORD-1001",
  status: "PENDING",
  delivery_type: "DELIVERY",
  delivery_date: "2026-09-27T05:00:00Z",
  total: 150000,
  payment_status: "PARTIALLY_PAID",
  created_at: "2026-09-26T05:00:00Z",
  customer_id: "c-1",
  customers: { id: "c-1", name: "Anu Sharma" },
  order_items: [
    { product_name: "Topper", product_id: null, created_at: "2026-09-26T05:00:02Z", products: null },
    { product_name: "Truffle cake", product_id: "p-1", created_at: "2026-09-26T05:00:01Z", products: { icon_key: "cake" } },
  ],
  ...overrides,
});

describe("toOrderListItem", () => {
  it("reads the order as a list shows it: the first line placed, the count, and what is left to pay", () => {
    expect(toOrderListItem(row(), 50000)).toEqual({
      id: "o-1",
      orderNumber: "ORD-1001",
      status: "PENDING",
      deliveryType: "DELIVERY",
      dueAt: "2026-09-27T05:00:00Z",
      customer: { id: "c-1", name: "Anu Sharma" },
      firstItem: { name: "Truffle cake", iconKey: "cake", custom: false },
      lineCount: 2,
      total: 150000,
      paymentStatus: "PARTIALLY_PAID",
      balanceDue: 100000,
      createdAt: "2026-09-26T05:00:00Z",
    });
  });

  it("reads a Guest order, a custom first line, and an order with no lines", () => {
    const guest = toOrderListItem(row({ customer_id: null, customers: null, order_items: [row().order_items[0]] }));
    expect(guest.customer).toBeNull();
    expect(guest.firstItem).toEqual({ name: "Topper", iconKey: null, custom: true });
    expect(toOrderListItem(row({ order_items: [] })).firstItem).toBeNull();
  });

  it("owes nothing once cancelled, and never less than nothing", () => {
    expect(toOrderListItem(row({ status: "CANCELLED" })).balanceDue).toBe(0);
    expect(toOrderListItem(row(), 999999).balanceDue).toBe(0);
  });
});

describe("toOrderListItems", () => {
  it("reads what has been paid on the page's orders in one query", async () => {
    const fake = fakeSupabase(() => ({ data: [{ order_id: "o-1", amount: 150000 }] }));
    const [item] = await toOrderListItems(tenantOf(fake.client), [row()]);
    expect(item.balanceDue).toBe(0);
    expect(fake.queries).toHaveLength(1);
    expect(fake.argsOf(fake.queries[0], "in")).toEqual([["order_id", ["o-1"]]]);
  });
});
