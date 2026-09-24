import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrdersClient } from "@/features/orders/api.client";
import { getJson, patchJson } from "@/lib/api/client";

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
