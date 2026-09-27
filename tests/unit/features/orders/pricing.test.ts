import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCustomerById, getProductsByIds } = vi.hoisted(() => ({
  getCustomerById: vi.fn(),
  getProductsByIds: vi.fn(),
}));
vi.mock("@/features/customers/api", () => ({ getCustomerById }));
vi.mock("@/features/products/api", () => ({ getProductsByIds }));

import { priceDraft, priceOrder, type KeptLine } from "@/features/orders/pricing";
import type { CreateOrderPayload } from "@/lib/validation";
import { tenantOf } from "@tests/support/tenant";

const CAKE = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const BREAD = "3f2504e0-4f89-11d3-9a0c-0305e82c3303";
const CUSTOMER = "3f2504e0-4f89-11d3-9a0c-0305e82c3302";

const product = (id: string, name: string, defaultPrice: number, isActive = true) => ({ id, name, defaultPrice, isActive });

function draft(overrides: Partial<CreateOrderPayload> = {}): CreateOrderPayload {
  return {
    customer: { kind: "GUEST" },
    items: [{ productId: CAKE, quantity: 2, notes: "Happy birthday, Anu" }],
    adjustments: [],
    delivery: { type: "PICKUP", date: "2026-09-26T10:00:00.000Z", address: null, googleMapsLink: null },
    payment: { status: "UNPAID" },
    notes: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getProductsByIds.mockResolvedValue([product(CAKE, "Chocolate Truffle Cake", 125_000), product(BREAD, "Sourdough", 25_000)]);
  getCustomerById.mockResolvedValue({ id: CUSTOMER, name: "Priya Menon", phone: "+919876543210", email: "p@x.in" });
});

describe("priceDraft", () => {
  it("prices a catalogue line from the product as it is now, never from the request", async () => {
    const { lines, totals } = await priceDraft(tenantOf({}), draft());
    expect(lines).toEqual([
      { productId: CAKE, name: "Chocolate Truffle Cake", unitPrice: 125_000, quantity: 2, subtotal: 250_000, notes: "Happy birthday, Anu" },
    ]);
    expect(totals).toEqual({ subtotal: 250_000, discount: 0, deliveryCharge: 0, tax: 0, total: 250_000 });
  });

  it("reads every product in one query, each once", async () => {
    await priceDraft(tenantOf({}), draft({ items: [
      { productId: CAKE, quantity: 1, notes: null },
      { productId: BREAD, quantity: 1, notes: null },
      { productId: CAKE, quantity: 3, notes: null },
    ] }));
    expect(getProductsByIds).toHaveBeenCalledOnce();
    expect(getProductsByIds).toHaveBeenCalledWith(tenantOf({}), [CAKE, BREAD, CAKE]);
  });

  it("takes a custom line's typed name and price, with no product (§139.11.7)", async () => {
    const { lines, totals } = await priceDraft(
      tenantOf({}),
      draft({ items: [{ custom: { name: "Name topper", unitPrice: 15_000 }, quantity: 2, notes: null }] }),
    );
    expect(lines).toEqual([{ productId: null, name: "Name topper", unitPrice: 15_000, quantity: 2, subtotal: 30_000, notes: null }]);
    expect(totals.total).toBe(30_000);
  });

  it("applies discounts and charges by their type", async () => {
    const { totals } = await priceDraft(tenantOf({}), draft({ adjustments: [
      { type: "DISCOUNT", name: "Festive", amount: 10_000 },
      { type: "CHARGE", name: "Delivery", amount: 8_000 },
    ] }));
    expect(totals).toMatchObject({ subtotal: 250_000, discount: 10_000, deliveryCharge: 8_000, total: 248_000 });
  });

  it("names a Guest without reading a customer", async () => {
    const { customer } = await priceDraft(tenantOf({}), draft());
    expect(customer).toEqual({ kind: "GUEST" });
    expect(getCustomerById).not.toHaveBeenCalled();
  });

  it("reads a named customer back through this business, keeping only what a bill shows", async () => {
    const tenant = tenantOf({});
    const { customer } = await priceDraft(tenant, draft({ customer: { kind: "CUSTOMER", id: CUSTOMER } }));
    expect(getCustomerById).toHaveBeenCalledWith(tenant, CUSTOMER);
    expect(customer).toEqual({ kind: "CUSTOMER", id: CUSTOMER, name: "Priya Menon", phone: "+919876543210" });
  });

  it("refuses a customer this business does not have (BUG-19)", async () => {
    getCustomerById.mockRejectedValue(Object.assign(new Error("x"), { code: "RECORD_NOT_FOUND" }));
    await expect(priceDraft(tenantOf({}), draft({ customer: { kind: "CUSTOMER", id: CUSTOMER } }))).rejects.toMatchObject({
      code: "RECORD_NOT_FOUND",
    });
  });

  it("refuses a product that is gone, another business's, or off the menu", async () => {
    for (const found of [[], [product(CAKE, "Chocolate Truffle Cake", 125_000, false)]]) {
      getProductsByIds.mockResolvedValue(found);
      await expect(priceDraft(tenantOf({}), draft())).rejects.toMatchObject({
        code: "ORDER_PRODUCT_UNAVAILABLE",
        kind: "CONFLICT",
        details: { productId: CAKE },
      });
    }
  });

  it("refuses discounts that come to more than the order", async () => {
    await expect(
      priceDraft(tenantOf({}), draft({ adjustments: [{ type: "DISCOUNT", name: "Too much", amount: 300_000 }] })),
    ).rejects.toMatchObject({ code: "ORDER_TOTAL_NEGATIVE", kind: "BUSINESS_RULE" });
  });

  it("takes the whole total as paid in full, and part paid as typed (§139.11.9)", async () => {
    const paid = await priceDraft(tenantOf({}), draft({ payment: { status: "PAID", method: "UPI", reference: "U-1" } }));
    expect(paid.payment).toEqual({ status: "PAID", amount: 250_000, method: "UPI", reference: "U-1" });

    const part = await priceDraft(tenantOf({}), draft({ payment: { status: "PARTIALLY_PAID", amount: 50_000, method: "CASH", reference: null } }));
    expect(part.payment).toEqual({ status: "PARTIALLY_PAID", amount: 50_000, method: "CASH", reference: null });

    expect((await priceDraft(tenantOf({}), draft())).payment).toEqual({ status: "UNPAID" });
  });

  it("refuses a part payment that is the whole total or more", async () => {
    for (const amount of [250_000, 250_001]) {
      await expect(
        priceDraft(tenantOf({}), draft({ payment: { status: "PARTIALLY_PAID", amount, method: "CASH", reference: null } })),
      ).rejects.toMatchObject({ code: "PAYMENT_PART_NOT_LESS", kind: "BUSINESS_RULE" });
    }
  });

  it("refuses a total that would not fit its column (BUG-12)", async () => {
    getProductsByIds.mockResolvedValue([product(CAKE, "Wedding cake", 100_000_000)]);
    await expect(priceDraft(tenantOf({}), draft({ items: [{ productId: CAKE, quantity: 9_999, notes: null }] }))).rejects.toMatchObject({
      code: "ORDER_TOTAL_TOO_LARGE",
      kind: "BUSINESS_RULE",
    });
  });
});

describe("priceOrder: an order being changed (§139.11.13)", () => {
  const LINE = "3f2504e0-4f89-11d3-9a0c-0305e82c3310";
  const TOPPER = "3f2504e0-4f89-11d3-9a0c-0305e82c3311";
  // Ordered at ₹1,000 a cake; the cake costs ₹1,250 now.
  const kept = new Map<string, KeptLine>([
    [LINE, { id: LINE, product_id: CAKE, product_name: "Truffle Cake (as ordered)", unit_price: 100_000 }],
    [TOPPER, { id: TOPPER, product_id: null, product_name: "Name topper", unit_price: 15_000 }],
  ]);

  it("keeps a line already on the order at the name and price it was ordered at, whatever was sent", async () => {
    const { lines, totals } = await priceOrder(
      tenantOf({}),
      {
        customer: { kind: "GUEST" },
        items: [
          { itemId: LINE, productId: BREAD, quantity: 3, notes: "No nuts" },
          { itemId: TOPPER, custom: { name: "Changed", unitPrice: 1 }, quantity: 1, notes: null },
          { productId: CAKE, quantity: 1, notes: null },
        ],
        adjustments: [],
      },
      kept,
    );
    expect(lines).toEqual([
      { itemId: LINE, productId: CAKE, name: "Truffle Cake (as ordered)", unitPrice: 100_000, quantity: 3, subtotal: 300_000, notes: "No nuts" },
      { itemId: TOPPER, productId: null, name: "Name topper", unitPrice: 15_000, quantity: 1, subtotal: 15_000, notes: null },
      // A new line takes today's price.
      { productId: CAKE, name: "Chocolate Truffle Cake", unitPrice: 125_000, quantity: 1, subtotal: 125_000, notes: null },
    ]);
    expect(totals.total).toBe(440_000);
    // Only the new line's product is read.
    expect(getProductsByIds).toHaveBeenCalledWith(tenantOf({}), [CAKE]);
  });

  it("refuses a line the order no longer has: it changed somewhere else", async () => {
    await expect(
      priceOrder(tenantOf({}), {
        customer: { kind: "GUEST" },
        items: [{ itemId: "3f2504e0-4f89-11d3-9a0c-0305e82c3399", productId: CAKE, quantity: 1, notes: null }],
        adjustments: [],
      }),
    ).rejects.toMatchObject({ code: "ORDER_CHANGED", kind: "CONFLICT" });
  });
});
