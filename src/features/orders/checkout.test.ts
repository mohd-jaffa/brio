import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getProductById = vi.fn();
vi.mock("@/features/products/api", () => ({
  getProductById: (...args: unknown[]) => getProductById(...args),
}));
vi.mock("@/features/inventory/api", () => ({ logInventoryTransaction: vi.fn() }));
const insertOrder = vi.fn();
vi.mock("./api", () => ({
  generateOrderNumber: vi.fn().mockResolvedValue("#1-001"),
  insertOrder: (...args: unknown[]) => insertOrder(...args),
  insertOrderItems: vi.fn().mockResolvedValue([]),
  insertOrderAdjustments: vi.fn().mockResolvedValue([]),
  deleteOrderHard: vi.fn(),
}));

import { createOrder } from "./checkout";

const PRODUCT_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

function orderFor(quantity: number) {
  return {
    customerId: "3f2504e0-4f89-11d3-9a0c-0305e82c3302",
    items: [{ productId: PRODUCT_ID, quantity, notes: null }],
    adjustments: [],
    delivery: { type: "PICKUP" as const, date: "2026-09-25T10:00:00.000Z", address: null, googleMapsLink: null },
    payment: { status: "UNPAID" as const, reference: null },
    notes: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // The dearest a product can be: ₹10,00,000.
  getProductById.mockResolvedValue({ id: PRODUCT_ID, name: "Wedding cake", defaultPrice: 100_000_000, isActive: true });
});

describe("createOrder", () => {
  it("refuses an order whose total would not fit its column, before writing anything (BUG-12)", async () => {
    await expect(createOrder({} as SupabaseClient, "b-1", orderFor(9_999))).rejects.toMatchObject({
      code: "ORDER_TOTAL_TOO_LARGE",
      kind: "BUSINESS_RULE",
    });
    expect(insertOrder).not.toHaveBeenCalled();
  });

  it("accepts a large order that fits", async () => {
    insertOrder.mockResolvedValue({ id: "o-1" });
    await createOrder({} as SupabaseClient, "b-1", orderFor(10));
    expect(insertOrder).toHaveBeenCalledOnce();
    expect(insertOrder.mock.calls[0][2]).toMatchObject({ total: 1_000_000_000 });
  });
});
