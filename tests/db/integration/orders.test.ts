import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createOrder } from "@/features/orders/checkout";
import { updateOrder } from "@/features/orders/edit";
import { updateOrderStatus } from "@/features/orders/status";
import type { Order } from "@/features/orders/types";
import type { Product } from "@/features/products/types";
import { updateOrderSchema, updateOrderStatusSchema } from "@/lib/validation";
import {
  aCustomer,
  anOrder,
  registerBusiness,
  removeBusinesses,
  stockedProduct,
  stockOf,
  tomorrow,
  type TestBusiness,
} from "@tests/support/integration";

/**
 * An order's life against the database (AGENTS §12 – §14; plan §121 "Create
 * order", "Update order", "Inventory changes"): the server prices it, stores
 * it in one transaction with the stock it reserves, refuses to oversell, and
 * moves stock as the order moves. Through the app's own functions, as the
 * signed-in owner.
 */
let owner: TestBusiness;
let cake: Product;

beforeAll(async () => {
  owner = await registerBusiness("Order Bakes");
  cake = await stockedProduct(owner.tenant, { price: 25_000, stock: 50 });
});

afterAll(removeBusinesses);

const move = (order: Order, status: Order["status"]) =>
  updateOrderStatus(owner.tenant, order.id, updateOrderStatusSchema.parse({ status }));

/** The order's ledger lines for one product, as type and quantity. */
async function ledgerOf(order: Order) {
  const { data } = await owner.tenant.supabase
    .from("inventory_transactions")
    .select("type, quantity")
    .eq("reference_id", order.id)
    .order("created_at");
  return data;
}

describe("placing an order", () => {
  it("prices it on the server, stores it whole, and reserves its stock", async () => {
    const customer = await aCustomer(owner.tenant);
    const order = await createOrder(
      owner.tenant,
      anOrder({
        customer: { kind: "CUSTOMER", id: customer.id },
        items: [
          { productId: cake.id, quantity: 2 },
          { custom: { name: "Name on top", unitPrice: 5_000 }, quantity: 1 },
        ],
        adjustments: [
          { type: "CHARGE", name: "Delivery", amount: 4_000 },
          { type: "DISCOUNT", name: "Regular", amount: 1_000 },
        ],
      }),
      randomUUID(),
    );

    expect(order).toMatchObject({ status: "PENDING", customerId: customer.id, payment: { status: "UNPAID", paid: 0 } });
    expect(order.orderNumber).toMatch(/^ORD-\d+$/);
    expect(order.pricing).toEqual({ subtotal: 55_000, discount: 1_000, deliveryCharge: 4_000, tax: 0, total: 58_000 });
    expect(
      order.items.map(({ productName, unitPrice, quantity, custom }) => ({ productName, unitPrice, quantity, custom })),
    ).toEqual([
      { productName: "Plum cake", unitPrice: 25_000, quantity: 2, custom: false },
      { productName: "Name on top", unitPrice: 5_000, quantity: 1, custom: true },
    ]);
    // Only the catalogue line touches stock.
    expect(await ledgerOf(order)).toEqual([{ type: "ORDER_RESERVATION", quantity: -2 }]);
    expect(await stockOf(owner.tenant, cake.id)).toBe(48);

    const { data: audit } = await owner.tenant.supabase
      .from("audit_logs")
      .select("action, user_id")
      .eq("entity_id", order.id);
    expect(audit).toEqual([{ action: "CREATE", user_id: owner.userId }]);
  });

  it("makes one order of a double tap: the same key answers with the first", async () => {
    const before = await stockOf(owner.tenant, cake.id);
    const key = randomUUID();
    const input = anOrder({ items: [{ productId: cake.id, quantity: 1 }] });
    const [first, second] = await Promise.all([
      createOrder(owner.tenant, input, key),
      createOrder(owner.tenant, input, key),
    ]);
    expect(second.id).toBe(first.id);
    expect(await stockOf(owner.tenant, cake.id)).toBe(before - 1);
  });

  it("will not sell more than there is, and takes nothing when it refuses", async () => {
    const before = await stockOf(owner.tenant, cake.id);
    await expect(
      createOrder(owner.tenant, anOrder({ items: [{ productId: cake.id, quantity: before + 1 }] }), randomUUID()),
    ).rejects.toMatchObject({ code: "ORDER_INSUFFICIENT_STOCK" });
    expect(await stockOf(owner.tenant, cake.id)).toBe(before);
  });

  it("records a payment taken with the order, and the order is paid", async () => {
    const order = await createOrder(
      owner.tenant,
      anOrder({ items: [{ productId: cake.id, quantity: 1 }], payment: { status: "PAID", method: "UPI" } }),
      randomUUID(),
    );
    expect(order.payment).toMatchObject({ status: "PAID", paid: 25_000, method: "UPI" });
  });
});

describe("moving an order", () => {
  it("turns the reservation into what was used when it is delivered, and then it stays delivered", async () => {
    const order = await createOrder(
      owner.tenant,
      anOrder({ items: [{ productId: cake.id, quantity: 1 }] }),
      randomUUID(),
    );
    const reserved = await stockOf(owner.tenant, cake.id);

    expect((await move(order, "DELIVERED")).status).toBe("DELIVERED");
    expect(await stockOf(owner.tenant, cake.id)).toBe(reserved);
    expect(await ledgerOf(order)).toEqual([
      { type: "ORDER_RESERVATION", quantity: -1 },
      { type: "ORDER_RESERVATION", quantity: 1 },
      { type: "ORDER_CONSUMPTION", quantity: -1 },
    ]);
    await expect(move(order, "PENDING")).rejects.toMatchObject({ code: "ORDER_STATUS_TRANSITION_INVALID" });
  });

  it("gives the stock back when it is cancelled", async () => {
    const before = await stockOf(owner.tenant, cake.id);
    const order = await createOrder(
      owner.tenant,
      anOrder({ items: [{ productId: cake.id, quantity: 2 }] }),
      randomUUID(),
    );
    expect(await stockOf(owner.tenant, cake.id)).toBe(before - 2);
    await move(order, "CANCELLED");
    expect(await stockOf(owner.tenant, cake.id)).toBe(before);
  });

  it("refuses a move from where the order no longer is: another device moved it first", async () => {
    const order = await createOrder(
      owner.tenant,
      anOrder({ items: [{ productId: cake.id, quantity: 1 }] }),
      randomUUID(),
    );
    await move(order, "IN_PROGRESS");
    const { error } = await owner.tenant.supabase.rpc("change_order_status", {
      p_order_id: order.id,
      p_from: "PENDING",
      p_to: "READY",
    });
    expect(error?.hint).toBe("ORDER_STATUS_CHANGED");
  });
});

describe("changing an open order", () => {
  const edit = (order: Order, quantity: number) =>
    updateOrder(
      owner.tenant,
      order.id,
      updateOrderSchema.parse({
        customer: { kind: "GUEST" },
        items: [{ itemId: order.items[0].id, productId: cake.id, quantity }],
        delivery: { type: "PICKUP", date: tomorrow() },
      }),
    );

  it("moves the reservation with the quantity, checked against stock", async () => {
    const order = await createOrder(
      owner.tenant,
      anOrder({ items: [{ productId: cake.id, quantity: 1 }] }),
      randomUUID(),
    );
    const before = await stockOf(owner.tenant, cake.id);

    const changed = await edit(order, 3);
    expect(changed.pricing.total).toBe(75_000);
    expect(await stockOf(owner.tenant, cake.id)).toBe(before - 2);

    await expect(edit(order, 3 + before)).rejects.toMatchObject({ code: "ORDER_INSUFFICIENT_STOCK" });
    expect(await stockOf(owner.tenant, cake.id)).toBe(before - 2);
  });

  it("will not bring the total under what has been paid", async () => {
    const order = await createOrder(
      owner.tenant,
      anOrder({ items: [{ productId: cake.id, quantity: 2 }], payment: { status: "PAID", method: "CASH" } }),
      randomUUID(),
    );
    await expect(edit(order, 1)).rejects.toMatchObject({ code: "ORDER_TOTAL_BELOW_PAID" });
  });

  it("will not change a delivered order", async () => {
    const order = await createOrder(
      owner.tenant,
      anOrder({ items: [{ productId: cake.id, quantity: 1 }] }),
      randomUUID(),
    );
    await move(order, "DELIVERED");
    await expect(edit(order, 2)).rejects.toMatchObject({ code: "ORDER_NOT_EDITABLE" });
  });
});

describe("the database's own checks", () => {
  it("refuses a price below nothing, even from a request that skipped the app", async () => {
    const { error } = await owner.tenant.supabase
      .from("products")
      .insert({ bakery_id: owner.bakeryId, name: "Free money", default_price: -1, unit: "piece" });
    expect(error?.code).toBe("23514");
  });

  it("refuses a stock line whose sign does not match its kind (0033)", async () => {
    const before = await stockOf(owner.tenant, cake.id);
    for (const [type, quantity] of [
      ["STOCK_IN", -5],
      ["RETURN", 0],
      ["WASTAGE", 2],
      ["ORDER_CONSUMPTION", 1],
      ["ADJUSTMENT", 0],
    ] as const) {
      const { error } = await owner.tenant.supabase
        .from("inventory_transactions")
        .insert({ bakery_id: owner.bakeryId, product_id: cake.id, type, quantity });
      expect(error?.code, `${type} ${quantity}`).toBe("23514");
    }
    expect(await stockOf(owner.tenant, cake.id)).toBe(before);
  });
});
