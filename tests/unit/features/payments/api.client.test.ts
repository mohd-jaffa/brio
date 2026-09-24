import { beforeEach, describe, expect, it, vi } from "vitest";

import { PaymentsClient } from "@/features/payments/api.client";
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
