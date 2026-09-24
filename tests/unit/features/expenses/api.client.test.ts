import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExpensesClient } from "@/features/expenses/api.client";
import { deleteJson, getJson } from "@/lib/api/client";

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
    await ExpensesClient.list();
    expect(getJson).toHaveBeenCalledWith("/api/expenses");

    await ExpensesClient.deleteExpense("e-1");
    expect(deleteJson).toHaveBeenCalledWith("/api/expenses/e-1");
  });
});
