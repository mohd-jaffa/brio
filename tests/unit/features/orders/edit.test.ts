import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OrderItemRow, OrderRow } from "@/features/orders/types";
import type { UpdateOrderPayload } from "@/lib/validation";

const { findOrderById, getOrderById, logActionSafe, priceOrder } = vi.hoisted(() => ({
  findOrderById: vi.fn(),
  getOrderById: vi.fn(),
  logActionSafe: vi.fn(),
  priceOrder: vi.fn(),
}));
vi.mock("@/features/orders/api", () => ({ findOrderById }));
vi.mock("@/features/orders/queries", () => ({ getOrderById }));
vi.mock("@/features/orders/pricing", () => ({ priceOrder }));
vi.mock("@/lib/audit/auditLog", () => ({ logActionSafe }));

import { updateOrder } from "@/features/orders/edit";
import { tenantOf } from "@tests/support/tenant";

const CAKE = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const LINE = "3f2504e0-4f89-11d3-9a0c-0305e82c3310";
const CUSTOMER = "3f2504e0-4f89-11d3-9a0c-0305e82c3302";

const order = { id: "o-1", order_number: "ORD-1001", status: "IN_PROGRESS" } as OrderRow;
const line = { id: LINE, product_id: CAKE, product_name: "Truffle Cake", unit_price: 100_000, quantity: 1 } as OrderItemRow;
const before = { order, items: [line], adjustments: [] };
const after = { order: { ...order, total: 350_000 }, items: [{ ...line, quantity: 2 }], adjustments: [] };

const input: UpdateOrderPayload = {
  customer: { kind: "CUSTOMER", id: CUSTOMER },
  items: [
    { itemId: LINE, productId: CAKE, quantity: 2, notes: "No nuts" },
    { custom: { name: "Name topper", unitPrice: 15_000 }, quantity: 1, notes: null },
  ],
  adjustments: [{ type: "CHARGE", name: "Delivery", amount: 5_000 }],
  delivery: { type: "DELIVERY", date: "2026-09-30T10:00:00.000Z", address: "12 Lake Road", googleMapsLink: null },
  notes: "Ring twice",
};

function rpcClient(answer: { data: unknown; error: unknown }) {
  const calls: unknown[][] = [];
  const client = {
    rpc: (...args: unknown[]) => {
      calls.push(args);
      return { single: () => Promise.resolve(answer) };
    },
  };
  return { client, calls };
}

beforeEach(() => {
  vi.clearAllMocks();
  findOrderById.mockResolvedValueOnce(before).mockResolvedValueOnce(after);
  getOrderById.mockResolvedValue({ id: "o-1", orderNumber: "ORD-1001" });
  priceOrder.mockResolvedValue({
    customer: { kind: "CUSTOMER", id: CUSTOMER, name: "Priya", phone: "+919876543210" },
    lines: [
      { itemId: LINE, productId: CAKE, name: "Truffle Cake", unitPrice: 100_000, quantity: 2, subtotal: 200_000, notes: "No nuts" },
      { productId: null, name: "Name topper", unitPrice: 15_000, quantity: 1, subtotal: 15_000, notes: null },
    ],
    totals: { subtotal: 215_000, discount: 0, deliveryCharge: 5_000, tax: 0, total: 220_000 },
  });
});

describe("updateOrder", () => {
  it("prices the change against the order's own lines, and stores what the server priced in one call", async () => {
    const { client, calls } = rpcClient({ data: after.order, error: null });
    await expect(updateOrder(tenantOf(client), "o-1", input)).resolves.toEqual({ id: "o-1", orderNumber: "ORD-1001" });

    expect(priceOrder).toHaveBeenCalledWith(tenantOf(client), input, new Map([[LINE, line]]));
    expect(calls).toEqual([
      [
        "update_order",
        {
          p_order_id: "o-1",
          p_order: {
            customer_id: CUSTOMER,
            delivery_type: "DELIVERY",
            delivery_date: "2026-09-30T10:00:00.000Z",
            delivery_address: "12 Lake Road",
            delivery_google_maps_link: null,
            notes: "Ring twice",
            subtotal: 215_000,
            discount: 0,
            delivery_charge: 5_000,
            tax: 0,
            total: 220_000,
            items: [
              { item_id: LINE, product_id: CAKE, product_name: "Truffle Cake", unit_price: 100_000, quantity: 2, subtotal: 200_000, notes: "No nuts" },
              { item_id: null, product_id: null, product_name: "Name topper", unit_price: 15_000, quantity: 1, subtotal: 15_000, notes: null },
            ],
            adjustments: [{ type: "CHARGE", name: "Delivery", amount: 5_000 }],
          },
        },
      ],
    ]);
  });

  it("records the change in the audit trail, before and after, as the user who made it", async () => {
    const { client } = rpcClient({ data: after.order, error: null });
    await updateOrder(tenantOf(client), "o-1", input);
    expect(logActionSafe).toHaveBeenCalledWith(tenantOf(client), {
      action: "UPDATE",
      entity_type: "orders",
      entity_id: "o-1",
      previous_data: before,
      new_data: after,
    });
  });

  it("stores a Guest order with no customer", async () => {
    priceOrder.mockResolvedValue({ customer: { kind: "GUEST" }, lines: [], totals: { subtotal: 0, discount: 0, deliveryCharge: 0, tax: 0, total: 0 } });
    const { client, calls } = rpcClient({ data: after.order, error: null });
    await updateOrder(tenantOf(client), "o-1", { ...input, customer: { kind: "GUEST" } });
    expect((calls[0][1] as { p_order: { customer_id: unknown } }).p_order.customer_id).toBeNull();
  });

  it("refuses a finished order before pricing anything", async () => {
    findOrderById.mockReset().mockResolvedValue({ ...before, order: { ...order, status: "DELIVERED" } });
    const { client, calls } = rpcClient({ data: null, error: null });
    await expect(updateOrder(tenantOf(client), "o-1", input)).rejects.toMatchObject({
      code: "ORDER_NOT_EDITABLE",
      kind: "BUSINESS_RULE",
    });
    expect(priceOrder).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it("turns the database's refusal into the app's words, and audits nothing", async () => {
    const { client } = rpcClient({
      data: null,
      error: { code: "P0001", message: "total below what was paid", hint: "ORDER_TOTAL_BELOW_PAID", details: null },
    });
    await expect(updateOrder(tenantOf(client), "o-1", input)).rejects.toMatchObject({
      code: "ORDER_TOTAL_BELOW_PAID",
      kind: "BUSINESS_RULE",
    });
    expect(logActionSafe).not.toHaveBeenCalled();
  });
});
