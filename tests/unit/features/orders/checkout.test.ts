import { beforeEach, describe, expect, it, vi } from "vitest";

const { priceDraft, logInventoryTransaction, logActionSafe, insertOrder, insertOrderItems } = vi.hoisted(() => ({
  priceDraft: vi.fn(),
  logInventoryTransaction: vi.fn(),
  logActionSafe: vi.fn(),
  insertOrder: vi.fn(),
  insertOrderItems: vi.fn(),
}));
vi.mock("@/features/orders/pricing", () => ({ priceDraft }));
vi.mock("@/features/inventory/api", () => ({ logInventoryTransaction }));
vi.mock("@/lib/audit/auditLog", () => ({ logActionSafe }));
vi.mock("@/features/orders/api", () => ({
  generateOrderNumber: vi.fn().mockResolvedValue("#1-001"),
  insertOrder,
  insertOrderItems,
  insertOrderAdjustments: vi.fn().mockResolvedValue([]),
  deleteOrderHard: vi.fn(),
}));

import { createOrder } from "@/features/orders/checkout";
import type { CreateOrderPayload } from "@/lib/validation";
import { tenantOf } from "@tests/support/tenant";

const CUSTOMER_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3302";

const order: CreateOrderPayload = {
  customer: { kind: "CUSTOMER", id: CUSTOMER_ID },
  items: [],
  adjustments: [],
  delivery: { type: "PICKUP", date: "2026-09-25T10:00:00.000Z", address: null, googleMapsLink: null },
  payment: { status: "UNPAID", reference: null },
  notes: null,
};

const totals = { subtotal: 1_000, discount: 0, deliveryCharge: 0, tax: 0, total: 1_000 };

beforeEach(() => {
  vi.clearAllMocks();
  priceDraft.mockResolvedValue({
    customer: { kind: "CUSTOMER", id: CUSTOMER_ID, name: "Anu", phone: "+919812345678" },
    lines: [
      { productId: "p-1", name: "Cake", unitPrice: 500, quantity: 1, subtotal: 500, notes: null },
      { productId: null, name: "Topper", unitPrice: 500, quantity: 1, subtotal: 500, notes: null },
    ],
    totals,
  });
  insertOrder.mockResolvedValue({ id: "o-1", total: 1_000 });
  insertOrderItems.mockImplementation(async (_tenant, rows: Record<string, unknown>[]) =>
    rows.map((row, index) => ({ ...row, id: `i-${index}` })),
  );
});

describe("createOrder", () => {
  it("stores what the server priced, never what was sent", async () => {
    await createOrder(tenantOf({}), order);
    expect(insertOrder.mock.calls[0][1]).toMatchObject({ customer_id: CUSTOMER_ID, subtotal: 1_000, total: 1_000 });
    expect(insertOrderItems.mock.calls[0][1]).toEqual([
      expect.objectContaining({ product_id: "p-1", product_name: "Cake", unit_price: 500 }),
      expect.objectContaining({ product_id: null, product_name: "Topper", unit_price: 500 }),
    ]);
  });

  it("stores a Guest order with no customer (§139.11.3)", async () => {
    priceDraft.mockResolvedValue({ customer: { kind: "GUEST" }, lines: [], totals });
    await createOrder(tenantOf({}), { ...order, customer: { kind: "GUEST" } });
    expect(insertOrder.mock.calls[0][1]).toMatchObject({ customer_id: null });
  });

  it("reserves stock for catalogue lines only — a custom line moves none (§139.11.7)", async () => {
    await createOrder(tenantOf({}), order);
    expect(logInventoryTransaction).toHaveBeenCalledOnce();
    expect(logInventoryTransaction.mock.calls[0][1]).toMatchObject({ productId: "p-1", type: "ORDER_RESERVATION", quantity: -1 });
  });

  it("writes nothing when the draft cannot be priced", async () => {
    priceDraft.mockRejectedValue(Object.assign(new Error("x"), { code: "ORDER_TOTAL_TOO_LARGE" }));
    await expect(createOrder(tenantOf({}), order)).rejects.toMatchObject({ code: "ORDER_TOTAL_TOO_LARGE" });
    expect(insertOrder).not.toHaveBeenCalled();
  });

  it("audits the new order, as the user who placed it", async () => {
    const tenant = tenantOf({}, { actorId: "u-7" });
    await createOrder(tenant, order);
    expect(logActionSafe).toHaveBeenCalledWith(tenant, {
      action: "CREATE",
      entity_type: "orders",
      entity_id: "o-1",
      new_data: { id: "o-1", total: 1_000 },
    });
  });
});
