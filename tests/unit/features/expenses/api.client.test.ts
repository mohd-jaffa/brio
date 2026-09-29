import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExpensesClient } from "@/features/expenses/api.client";
import { deleteJson, patchJson, postJson } from "@/lib/api/client";

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
describe("ExpensesClient", () => {
  it("reads, writes and removes on the expenses routes", async () => {
    await ExpensesClient.createExpense({
      category: "Rent",
      description: "Kitchen",
      amount: 100,
      expenseDate: "2026-09-26",
      paymentMethod: "UPI",
    });
    expect(postJson).toHaveBeenCalledWith("/api/expenses", expect.objectContaining({ category: "Rent" }));

    await ExpensesClient.updateExpense("e-1", { amount: 200 });
    expect(patchJson).toHaveBeenCalledWith("/api/expenses/e-1", { amount: 200 });

    await ExpensesClient.deleteExpense("e-1");
    expect(deleteJson).toHaveBeenCalledWith("/api/expenses/e-1");
  });

  it("adds, changes and deletes a category of the business's own on its route, the name made safe for a path", async () => {
    await ExpensesClient.createCategory({ name: "Flowers", iconKey: "rose-bunch" });
    expect(postJson).toHaveBeenCalledWith("/api/expense-categories", { name: "Flowers", iconKey: "rose-bunch" });

    await ExpensesClient.updateCategory("100% cocoa", { name: "Cocoa", iconKey: null });
    expect(patchJson).toHaveBeenCalledWith("/api/expense-categories/100%25%20cocoa", { name: "Cocoa", iconKey: null });

    await ExpensesClient.setCategoryIcon("Flowers", "gift-box");
    expect(patchJson).toHaveBeenCalledWith("/api/expense-categories/Flowers", { name: "Flowers", iconKey: "gift-box" });

    await ExpensesClient.deleteCategory("Flowers");
    expect(deleteJson).toHaveBeenCalledWith("/api/expense-categories/Flowers");
  });
});
