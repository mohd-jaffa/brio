import { beforeEach, describe, expect, it, vi } from "vitest";

const getCustomerById = vi.fn();
vi.mock("@/features/customers/api", () => ({
  getCustomerById: (...args: unknown[]) => getCustomerById(...args),
}));
const getProductById = vi.fn();
vi.mock("@/features/products/api", () => ({
  getProductById: (...args: unknown[]) => getProductById(...args),
}));
vi.mock("@/features/inventory/api", () => ({ logInventoryTransaction: vi.fn() }));
const logActionSafe = vi.fn();
vi.mock("@/lib/audit/auditLog", () => ({ logActionSafe: (...args: unknown[]) => logActionSafe(...args) }));
const insertOrder = vi.fn();
vi.mock("@/features/orders/api", () => ({
  generateOrderNumber: vi.fn().mockResolvedValue("#1-001"),
  insertOrder: (...args: unknown[]) => insertOrder(...args),
  insertOrderItems: vi.fn().mockResolvedValue([]),
  insertOrderAdjustments: vi.fn().mockResolvedValue([]),
  deleteOrderHard: vi.fn(),
}));

import { createOrder } from "@/features/orders/checkout";
import { tenantOf } from "@tests/support/tenant";

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
  getCustomerById.mockResolvedValue({ id: "c-1" });
  // The dearest a product can be: ₹10,00,000.
  getProductById.mockResolvedValue({ id: PRODUCT_ID, name: "Wedding cake", defaultPrice: 100_000_000, isActive: true });
});

describe("createOrder", () => {
  it("refuses an order whose total would not fit its column, before writing anything (BUG-12)", async () => {
    await expect(createOrder(tenantOf({}), orderFor(9_999))).rejects.toMatchObject({
      code: "ORDER_TOTAL_TOO_LARGE",
      kind: "BUSINESS_RULE",
    });
    expect(insertOrder).not.toHaveBeenCalled();
  });

  it("refuses a customer this business does not have, before writing anything (BUG-19)", async () => {
    getCustomerById.mockRejectedValue(Object.assign(new Error("not found"), { code: "RECORD_NOT_FOUND" }));
    await expect(createOrder(tenantOf({}), orderFor(1))).rejects.toMatchObject({
      code: "RECORD_NOT_FOUND",
    });
    expect(getCustomerById).toHaveBeenCalledWith(tenantOf({}), "3f2504e0-4f89-11d3-9a0c-0305e82c3302");
    expect(insertOrder).not.toHaveBeenCalled();
  });

  it("accepts a large order that fits", async () => {
    insertOrder.mockResolvedValue({ id: "o-1" });
    await createOrder(tenantOf({}), orderFor(10));
    expect(insertOrder).toHaveBeenCalledOnce();
    expect(insertOrder.mock.calls[0][1]).toMatchObject({ total: 1_000_000_000 });
  });

  it("audits the new order, as the user who placed it", async () => {
    insertOrder.mockResolvedValue({ id: "o-1", total: 1_000 });
    const tenant = tenantOf({}, { actorId: "u-7" });
    await createOrder(tenant, orderFor(1));
    expect(logActionSafe).toHaveBeenCalledWith(tenant, {
      action: "CREATE",
      entity_type: "orders",
      entity_id: "o-1",
      new_data: { id: "o-1", total: 1_000 },
    });
  });
});
