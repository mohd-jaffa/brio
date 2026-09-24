import { beforeEach, describe, expect, it, vi } from "vitest";

import { InventoryClient } from "@/features/inventory/api.client";
import { getJson, postJson } from "@/lib/api/client";

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
