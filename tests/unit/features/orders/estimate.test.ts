import { beforeEach, describe, expect, it, vi } from "vitest";

const priceDraft = vi.hoisted(() => vi.fn());
vi.mock("@/features/orders/pricing", () => ({ priceDraft }));

import { estimateOrder } from "@/features/orders/estimate";
import type { CreateOrderPayload } from "@/lib/validation";
import { tenantOf } from "@tests/support/tenant";

const draft: CreateOrderPayload = {
  customer: { kind: "GUEST" },
  items: [],
  adjustments: [{ type: "CHARGE", name: "Delivery", amount: 8_000 }],
  delivery: { type: "DELIVERY", date: "2026-09-26T10:00:00.000Z", address: "12 MG Road", googleMapsLink: null },
  payment: { status: "PARTIALLY_PAID", amount: 50_000, method: "UPI", reference: "U-1" },
  notes: "Internal only",
};

const lines = [
  { productId: "p-1", name: "Red Velvet Cake", unitPrice: 98_000, quantity: 4, subtotal: 392_000, notes: null },
  { productId: null, name: "Name topper", unitPrice: 15_000, quantity: 1, subtotal: 15_000, notes: null },
];
const totals = { subtotal: 407_000, discount: 0, deliveryCharge: 8_000, tax: 0, total: 415_000 };

/** Everything the estimate may call: the stock check, and nothing that writes. */
function readOnlyClient(shortfalls: unknown[] = []) {
  const calls: unknown[][] = [];
  const client = {
    rpc: (...args: unknown[]) => {
      calls.push(args);
      return Promise.resolve({ data: shortfalls, error: null });
    },
    from: () => {
      throw new Error("an estimate writes nothing");
    },
  };
  return { client, calls };
}

beforeEach(() => {
  vi.clearAllMocks();
  priceDraft.mockResolvedValue({
    customer: { kind: "GUEST" },
    lines,
    totals,
    payment: { status: "PARTIALLY_PAID", amount: 50_000, method: "UPI", reference: "U-1" },
  });
});

describe("estimateOrder (§139.11.5)", () => {
  it("is the server's pricing, with payment so far and what would be left to pay", async () => {
    const { client } = readOnlyClient();
    const estimate = await estimateOrder(tenantOf(client), draft);

    expect(priceDraft).toHaveBeenCalledWith(tenantOf(client), draft);
    expect(estimate).toMatchObject({
      customer: { kind: "GUEST" },
      lines,
      adjustments: [{ type: "CHARGE", name: "Delivery", amount: 8_000 }],
      totals,
      delivery: { type: "DELIVERY", date: "2026-09-26T10:00:00.000Z", address: "12 MG Road", googleMapsLink: null },
      payment: { status: "PARTIALLY_PAID", paid: 50_000, method: "UPI", reference: "U-1" },
      balanceDue: 365_000,
      shortfalls: [],
    });
    expect(Date.parse(estimate.issuedAt)).not.toBeNaN();
  });

  it("never carries the internal notes, which a bill never shows", async () => {
    const { client } = readOnlyClient();
    expect(JSON.stringify(await estimateOrder(tenantOf(client), draft))).not.toContain("Internal only");
  });

  it("checks stock for catalogue lines only, and says what is short", async () => {
    const { client, calls } = readOnlyClient([{ product_id: "p-1", product_name: "Red Velvet Cake", available: 2, requested: 4 }]);
    const estimate = await estimateOrder(tenantOf(client), draft);

    expect(calls).toEqual([["stock_shortfalls", { p_lines: [{ product_id: "p-1", quantity: 4 }] }]]);
    expect(estimate.shortfalls).toEqual([{ productId: "p-1", name: "Red Velvet Cake", available: 2, requested: 4 }]);
  });

  it("asks nothing about stock when every line is custom", async () => {
    priceDraft.mockResolvedValue({ customer: { kind: "GUEST" }, lines: [lines[1]], totals, payment: { status: "UNPAID" } });
    const { client, calls } = readOnlyClient();
    const estimate = await estimateOrder(tenantOf(client), draft);

    expect(calls).toEqual([]);
    expect(estimate.payment).toEqual({ status: "UNPAID", paid: 0, method: null, reference: null });
    expect(estimate.balanceDue).toBe(415_000);
  });

  it("passes on a stock check that failed, in the app's words", async () => {
    const client = { rpc: () => Promise.resolve({ data: null, error: { code: "42501", message: "permission denied" } }) };
    await expect(estimateOrder(tenantOf(client), draft)).rejects.toMatchObject({ code: "AUTH_ROLE_FORBIDDEN" });
  });
});
