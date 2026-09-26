import { beforeEach, describe, expect, it, vi } from "vitest";

import { CustomersClient } from "@/features/customers/api.client";
import { getJson, patchJson, postJson } from "@/lib/api/client";

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
    await CustomersClient.get("c-1");
    expect(getJson).toHaveBeenCalledWith("/api/customers/c-1");

    await CustomersClient.createCustomer({ name: "Meena", phone: "9876543210" });
    expect(postJson).toHaveBeenCalledWith("/api/customers", { name: "Meena", phone: "9876543210" });

    await CustomersClient.updateCustomer("c-1", { name: "Meena G" });
    expect(patchJson).toHaveBeenCalledWith("/api/customers/c-1", { name: "Meena G" });
  });
});
