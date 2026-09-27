import { describe, expect, it } from "vitest";

import {
  countOrders,
  listOrders,
  ORDER_LIST_COLUMNS,
  orderSearchFilter,
  toOrderListItem,
  toOrderListItems,
  type OrderListRow,
} from "@/features/orders/list";
import { PAGE_SIZE } from "@/constants/limits";
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
    // The lines come back in no particular order; the first placed leads (0025's position).
    { product_name: "Topper", product_id: null, position: 12, products: null },
    { product_name: "Truffle cake", product_id: "p-1", position: 11, products: { icon_key: "cake" } },
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

describe("orderSearchFilter", () => {
  it("matches the number or the customer's name, and the phone on its digits (BUG-23)", () => {
    expect(orderSearchFilter("Anu")).toBe('order_number.ilike."%Anu%",customer_name.ilike."%Anu%"');
    expect(orderSearchFilter("98765 43210")).toBe(
      'order_number.ilike."%98765 43210%",customer_name.ilike."%98765 43210%",customer_phone.like."%9876543210%"',
    );
  });

  it("looks for nothing when nothing is left to look for", () => {
    expect(orderSearchFilter(null)).toBeNull();
    expect(orderSearchFilter("%*")).toBeNull();
  });
});

const QUERY = { search: null } as const;

describe("listOrders", () => {
  it("reads a page of the business's orders from the search view, newest first", async () => {
    const fake = fakeSupabase((query) => (query.table === "payments" ? { data: [] } : { data: [row()] }));
    const page = await listOrders(tenantOf(fake.client), QUERY);

    const [orders] = fake.queries;
    expect(orders.table).toBe("order_search");
    expect(fake.argsOf(orders, "select")).toEqual([[ORDER_LIST_COLUMNS, undefined]]);
    expect(fake.argsOf(orders, "eq")).toEqual([["bakery_id", "b-1"]]);
    expect(fake.argsOf(orders, "order")).toEqual([
      ["created_at", { ascending: false }],
      ["id", { ascending: true }],
    ]);
    expect(fake.argsOf(orders, "range")).toEqual([[0, PAGE_SIZE]]);
    expect(page).toEqual({ items: [expect.objectContaining({ id: "o-1", balanceDue: 150000 })], nextCursor: null });
  });

  it("keeps to a tab, a customer, payment, due dates and a search, and says where the next page starts", async () => {
    const rows = Array.from({ length: PAGE_SIZE + 1 }, (_, index) => row({ id: `o-${index}` }));
    const fake = fakeSupabase((query) => (query.table === "payments" ? { data: [] } : { data: rows }));
    const page = await listOrders(tenantOf(fake.client), {
      status: "PENDING",
      customer: "c-1",
      payment: "UNPAID",
      from: "2026-09-01",
      to: "2026-09-30",
      search: "Anu",
      cursor: 20,
    });

    const [orders, payments] = fake.queries;
    expect(fake.argsOf(orders, "eq")).toEqual([
      ["bakery_id", "b-1"],
      ["customer_id", "c-1"],
      ["payment_status", "UNPAID"],
      ["status", "PENDING"],
    ]);
    expect(fake.argsOf(orders, "gte")).toEqual([["delivery_date", "2026-08-31T18:30:00.000Z"]]);
    expect(fake.argsOf(orders, "lt")).toEqual([["delivery_date", "2026-09-30T18:30:00.000Z"]]);
    expect(fake.argsOf(orders, "or")).toEqual([['order_number.ilike."%Anu%",customer_name.ilike."%Anu%"']]);
    // An open status is worked soonest due first.
    expect(fake.argsOf(orders, "order")[0]).toEqual(["delivery_date", { ascending: true }]);
    expect(fake.argsOf(orders, "range")).toEqual([[20, 20 + PAGE_SIZE]]);
    expect(page.items).toHaveLength(PAGE_SIZE);
    expect(page.nextCursor).toBe(String(20 + PAGE_SIZE));
    // Only the page's own orders are asked about their payments.
    expect(fake.argsOf(payments, "in")[0][1]).toHaveLength(PAGE_SIZE);
  });

  it("reads Guest orders, and a finished status most recently due first", async () => {
    const fake = fakeSupabase(() => ({ data: [] }));
    await listOrders(tenantOf(fake.client), { ...QUERY, customer: "guest", status: "DELIVERED" });
    const [orders] = fake.queries;
    expect(fake.argsOf(orders, "is")).toEqual([["customer_id", null]]);
    expect(fake.argsOf(orders, "order")[0]).toEqual(["delivery_date", { ascending: false }]);
  });

  it("passes on a refusal in the app's own words", async () => {
    const fake = fakeSupabase(() => ({ error: { code: "42501", message: "permission denied for view order_search" } }));
    await expect(listOrders(tenantOf(fake.client), QUERY)).rejects.toMatchObject({ code: "AUTH_ROLE_FORBIDDEN", kind: "AUTHORIZATION" });
  });
});

describe("countOrders", () => {
  it("counts every tab under the same filters, in the database, at once", async () => {
    const fake = fakeSupabase((query) => {
      const status = query.calls.find(([name, column]) => name === "eq" && column === "status")?.[2];
      return { count: status === "PENDING" ? 2 : status ? 1 : 7 };
    });
    const counts = await countOrders(tenantOf(fake.client), { search: "Anu", payment: "PAID" });

    expect(counts).toEqual({ ALL: 7, PENDING: 2, IN_PROGRESS: 1, READY: 1, IN_TRANSIT: 1, DELIVERED: 1, CANCELLED: 1 });
    expect(fake.queries).toHaveLength(7);
    for (const query of fake.queries) {
      expect(fake.argsOf(query, "select")).toEqual([["id", { count: "exact", head: true }]]);
      expect(fake.argsOf(query, "eq").slice(0, 2)).toEqual([
        ["bakery_id", "b-1"],
        ["payment_status", "PAID"],
      ]);
      expect(fake.argsOf(query, "or")).toHaveLength(1);
    }
  });

  it("counts nothing as none, and passes on a refusal", async () => {
    expect((await countOrders(tenantOf(fakeSupabase(() => ({ count: null })).client), QUERY)).ALL).toBe(0);
    const refused = fakeSupabase(() => ({ error: { code: "PGRST000", message: "down" } }));
    await expect(countOrders(tenantOf(refused.client), QUERY)).rejects.toBeDefined();
  });
});
