import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductsClient } from "@/features/products/api.client";
import { patchJson, postJson } from "@/lib/api/client";

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
describe("ProductsClient", () => {
  it("writes the products routes", async () => {
    await ProductsClient.createProduct({ name: "Brownie", defaultPrice: 8000 });
    expect(postJson).toHaveBeenCalledWith("/api/products", { name: "Brownie", defaultPrice: 8000 });

    await ProductsClient.updateProduct("p-1", { isActive: false });
    expect(patchJson).toHaveBeenCalledWith("/api/products/p-1", { isActive: false });
  });
});
