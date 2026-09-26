import { describe, expect, it } from "vitest";

import { apiRoutes } from "@/lib/query/keys";

describe("apiRoutes", () => {
  it("names every endpoint the browser calls", () => {
    expect(apiRoutes.customers.list).toBe("/api/customers");
    expect(apiRoutes.customers.detail("c-1")).toBe("/api/customers/c-1");
    expect(apiRoutes.orders.payments("o-1")).toBe("/api/orders/o-1/payments");
    expect(apiRoutes.orders.bill("o-1")).toBe("/api/orders/o-1/bill");
    expect(apiRoutes.orders.billPdf("o-1")).toBe("/api/orders/o-1/bill.pdf");
  });

  it("asks for every balance when no product is named", () => {
    expect(apiRoutes.inventory.balances()).toBe("/api/inventory/balance");
    expect(apiRoutes.inventory.balances([])).toBe("/api/inventory/balance");
  });

  it("asks for only the products named, as one parameter the route can read", () => {
    expect(apiRoutes.inventory.balances(["a", "b"])).toBe("/api/inventory/balance?products=a,b");
  });

  it("gives a mutation the same key its query used, so nothing goes stale", () => {
    expect(apiRoutes.products.list).toBe(apiRoutes.products.list);
    expect(apiRoutes.orders.detail("o-1")).toBe(apiRoutes.orders.detail("o-1"));
  });
});
