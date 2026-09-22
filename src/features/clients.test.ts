import { beforeEach, describe, expect, it, vi } from "vitest";

import { CustomersClient } from "@/features/customers/api.client";
import { ExpensesClient } from "@/features/expenses/api.client";
import { InventoryClient } from "@/features/inventory/api.client";
import { OrdersClient } from "@/features/orders/api.client";
import { PaymentsClient } from "@/features/payments/api.client";
import { ProductsClient } from "@/features/products/api.client";
import { deleteJson, getJson, patchJson, postJson } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({
  getJson: vi.fn(),
  postJson: vi.fn(),
  patchJson: vi.fn(),
  deleteJson: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

/**
 * Each feature's client module is a list of endpoints and nothing else: the
 * envelope, the headers and the failures are the shared client's business
 * (src/lib/api/client.ts). What these check is that each call names the route
 * the rest of the app reads from, so a write refreshes what a read showed.
 */
describe("CustomersClient", () => {
  it("reads and writes the customers routes", async () => {
    await CustomersClient.list();
    expect(getJson).toHaveBeenCalledWith("/api/customers");

    await CustomersClient.get("c-1");
    expect(getJson).toHaveBeenCalledWith("/api/customers/c-1");

    await CustomersClient.createCustomer({ name: "Meena", phone: "9876543210" });
    expect(postJson).toHaveBeenCalledWith("/api/customers", { name: "Meena", phone: "9876543210" });

    await CustomersClient.updateCustomer("c-1", { name: "Meena G" });
    expect(patchJson).toHaveBeenCalledWith("/api/customers/c-1", { name: "Meena G" });
  });
});

describe("ProductsClient", () => {
  it("reads and writes the products routes", async () => {
    await ProductsClient.list();
    expect(getJson).toHaveBeenCalledWith("/api/products");

    await ProductsClient.createProduct({ name: "Brownie", defaultPrice: 8000 });
    expect(postJson).toHaveBeenCalledWith("/api/products", { name: "Brownie", defaultPrice: 8000 });

    await ProductsClient.updateProduct("p-1", { isActive: false });
    expect(patchJson).toHaveBeenCalledWith("/api/products/p-1", { isActive: false });
  });
});

describe("ExpensesClient", () => {
  it("reads, writes and removes on the expenses routes", async () => {
    await ExpensesClient.list();
    expect(getJson).toHaveBeenCalledWith("/api/expenses");

    await ExpensesClient.deleteExpense("e-1");
    expect(deleteJson).toHaveBeenCalledWith("/api/expenses/e-1");
  });
});

describe("InventoryClient", () => {
  it("asks for every balance, or only the products named", async () => {
    await InventoryClient.balances();
    expect(getJson).toHaveBeenCalledWith("/api/inventory/balance");

    await InventoryClient.balances(["p-1", "p-2"]);
    expect(getJson).toHaveBeenCalledWith("/api/inventory/balance?products=p-1,p-2");
  });

  it("posts a ledger movement", async () => {
    await InventoryClient.adjustStock({ productId: "p-1", type: "STOCK_IN", quantity: 5 });
    expect(postJson).toHaveBeenCalledWith("/api/inventory", {
      productId: "p-1",
      type: "STOCK_IN",
      quantity: 5,
    });
  });
});

describe("OrdersClient", () => {
  it("reads and writes the orders routes", async () => {
    await OrdersClient.list();
    expect(getJson).toHaveBeenCalledWith("/api/orders");

    await OrdersClient.getOrder("o-1");
    expect(getJson).toHaveBeenCalledWith("/api/orders/o-1");

    await OrdersClient.updateStatus("o-1", { status: "DELIVERED" });
    expect(patchJson).toHaveBeenCalledWith("/api/orders/o-1", { status: "DELIVERED" });
  });
});

describe("PaymentsClient", () => {
  it("names the order in the path, not in the body", async () => {
    await PaymentsClient.createPayment("o-1", { amount: 50000, payment_method: "UPI" });

    expect(postJson).toHaveBeenCalledWith("/api/orders/o-1/payments", {
      amount: 50000,
      payment_method: "UPI",
    });
  });

  it("reads an order's payments", async () => {
    await PaymentsClient.getPayments("o-1");
    expect(getJson).toHaveBeenCalledWith("/api/orders/o-1/payments");
  });
});
