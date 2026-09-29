import { beforeEach, describe, expect, it, vi } from "vitest";

const { priceDraft, logActionSafe, findOrderById, findPaymentsByOrderId, getOrderById } = vi.hoisted(() => ({
  priceDraft: vi.fn(),
  logActionSafe: vi.fn(),
  findOrderById: vi.fn(),
  findPaymentsByOrderId: vi.fn(),
  getOrderById: vi.fn(),
}));
vi.mock("@/features/orders/pricing", () => ({ priceDraft }));
vi.mock("@/lib/audit/auditLog", () => ({ logActionSafe }));
vi.mock("@/features/orders/api", () => ({ findOrderById }));
vi.mock("@/features/orders/queries", () => ({ getOrderById }));
vi.mock("@/features/payments/api", () => ({ findPaymentsByOrderId }));

import { createOrder } from "@/features/orders/checkout";
import type { CreateOrderPayload } from "@/lib/validation";
import { tenantOf } from "@tests/support/tenant";

const CUSTOMER_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3302";
const KEY = "0d9f4c1e-2b3a-4c5d-8e6f-7a8b9c0d1e2f";

const order: CreateOrderPayload = {
  customer: { kind: "CUSTOMER", id: CUSTOMER_ID },
  items: [],
  adjustments: [{ type: "DISCOUNT", name: "Festive", amount: 100 }],
  delivery: { type: "DELIVERY", date: "2026-09-25T10:00:00.000Z", address: "12 MG Road", googleMapsLink: null },
  payment: { status: "PARTIALLY_PAID", amount: 400, method: "UPI", reference: "UPI-1" },
  notes: "Ring twice",
};

const totals = { subtotal: 1_000, discount: 100, deliveryCharge: 0, tax: 0, total: 900 };

/** The RPC, answering as the database would. */
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
  priceDraft.mockResolvedValue({
    customer: { kind: "CUSTOMER", id: CUSTOMER_ID, name: "Anu", phone: "+919812345678" },
    lines: [
      { productId: "p-1", name: "Cake", unitPrice: 500, quantity: 1, subtotal: 500, notes: "Happy birthday" },
      { productId: null, name: "Topper", unitPrice: 500, quantity: 1, subtotal: 500, notes: null },
    ],
    totals,
    payment: { status: "PARTIALLY_PAID", amount: 400, method: "UPI", reference: "UPI-1" },
  });
  findOrderById.mockResolvedValue({ order: { id: "o-1", order_number: "ORD-1001" }, items: [], adjustments: [] });
  findPaymentsByOrderId.mockResolvedValue([{ id: "p-1", amount: 400 }]);
  getOrderById.mockResolvedValue({ id: "o-1", orderNumber: "ORD-1001" });
});

describe("createOrder", () => {
  it("hands create_order what the server priced, with the key, in one call", async () => {
    const { client, calls } = rpcClient({ data: { order_id: "o-1", created: true }, error: null });
    await expect(createOrder(tenantOf(client), order, KEY)).resolves.toEqual({ id: "o-1", orderNumber: "ORD-1001" });

    expect(calls).toEqual([
      [
        "create_order",
        {
          p_idempotency_key: KEY,
          p_order: {
            customer_id: CUSTOMER_ID,
            delivery_type: "DELIVERY",
            delivery_date: "2026-09-25T10:00:00.000Z",
            delivery_address: "12 MG Road",
            delivery_google_maps_link: null,
            notes: "Ring twice",
            subtotal: 1_000,
            discount: 100,
            delivery_charge: 0,
            tax: 0,
            total: 900,
            items: [
              {
                product_id: "p-1",
                product_name: "Cake",
                unit_price: 500,
                quantity: 1,
                subtotal: 500,
                notes: "Happy birthday",
              },
              { product_id: null, product_name: "Topper", unit_price: 500, quantity: 1, subtotal: 500, notes: null },
            ],
            adjustments: [{ type: "DISCOUNT", name: "Festive", amount: 100 }],
            payment: { amount: 400, method: "UPI", reference: "UPI-1" },
          },
        },
      ],
    ]);
  });

  it("sends a Guest as no customer, and an unpaid order with no payment", async () => {
    priceDraft.mockResolvedValue({ customer: { kind: "GUEST" }, lines: [], totals, payment: { status: "UNPAID" } });
    const { client, calls } = rpcClient({ data: { order_id: "o-1", created: true }, error: null });
    await createOrder(tenantOf(client), order, KEY);
    expect(calls[0][1]).toMatchObject({ p_order: { customer_id: null, payment: null } });
  });

  it("records no payment for an order that comes to nothing", async () => {
    priceDraft.mockResolvedValue({
      customer: { kind: "GUEST" },
      lines: [],
      totals: { ...totals, total: 0 },
      payment: { status: "PAID", amount: 0, method: "CASH", reference: null },
    });
    const { client, calls } = rpcClient({ data: { order_id: "o-1", created: true }, error: null });
    await createOrder(tenantOf(client), order, KEY);
    expect(calls[0][1]).toMatchObject({ p_order: { payment: null } });
  });

  it("audits the new order and its payment, as the user who placed it", async () => {
    const { client } = rpcClient({ data: { order_id: "o-1", created: true }, error: null });
    const tenant = tenantOf(client, { actorId: "u-7" });
    await createOrder(tenant, order, KEY);

    expect(logActionSafe).toHaveBeenCalledWith(tenant, {
      action: "CREATE",
      entity_type: "orders",
      entity_id: "o-1",
      new_data: { id: "o-1", order_number: "ORD-1001" },
    });
    expect(logActionSafe).toHaveBeenCalledWith(tenant, {
      action: "CREATE",
      entity_type: "payments",
      entity_id: "p-1",
      new_data: { id: "p-1", amount: 400 },
    });
  });

  it("answers a repeated key with the first order, and audits nothing again (§133.3 C2)", async () => {
    const { client } = rpcClient({ data: { order_id: "o-1", created: false }, error: null });
    await expect(createOrder(tenantOf(client), order, KEY)).resolves.toMatchObject({ id: "o-1" });
    expect(logActionSafe).not.toHaveBeenCalled();
  });

  it("passes on the stock that is short, in the app's words and with what is left (C4)", async () => {
    const { client } = rpcClient({
      data: null,
      error: {
        code: "P0001",
        hint: "ORDER_INSUFFICIENT_STOCK",
        message: "not enough stock",
        details: '{"shortfalls": [{"name": "Red Velvet Cake", "available": 2, "productId": "p-1", "requested": 4}]}',
      },
    });
    await expect(createOrder(tenantOf(client), order, KEY)).rejects.toMatchObject({
      code: "ORDER_INSUFFICIENT_STOCK",
      kind: "BUSINESS_RULE",
      httpStatus: 422,
      details: { shortfalls: [{ name: "Red Velvet Cake", available: 2, productId: "p-1", requested: 4 }] },
    });
    expect(logActionSafe).not.toHaveBeenCalled();
  });

  it("calls nothing when the draft cannot be priced", async () => {
    priceDraft.mockRejectedValue(Object.assign(new Error("x"), { code: "ORDER_TOTAL_TOO_LARGE" }));
    const { client, calls } = rpcClient({ data: null, error: null });
    await expect(createOrder(tenantOf(client), order, KEY)).rejects.toMatchObject({ code: "ORDER_TOTAL_TOO_LARGE" });
    expect(calls).toEqual([]);
  });
});
