import { describe, expect, it } from "vitest";

import {
  createCustomerSchema,
  createExpenseSchema,
  createOrderSchema,
  createPaymentSchema,
  createProductSchema,
  expenseFormSchema,
  logInventoryTransactionSchema,
  orderFormSchema,
  paymentFormSchema,
  productFormSchema,
  signedQuantity,
  stockAdjustmentFormSchema,
  updateOrderStatusSchema,
} from "./index";

const UUID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const OTHER_UUID = "9f1c8a52-3d66-4a1e-8b0a-6d1f0f3a2b77";

describe("customer", () => {
  it("normalises the phone number so one customer is one row", () => {
    const parsed = createCustomerSchema.parse({ name: "Meena", phone: "+91 98765-43210" });
    expect(parsed.phone).toBe("+919876543210");
  });

  it("stores the fields left blank as nothing", () => {
    const parsed = createCustomerSchema.parse({ name: "Meena", phone: "9876543210", email: "" });
    expect(parsed.email).toBeNull();
  });

  it("insists on a name", () => {
    expect(createCustomerSchema.safeParse({ name: "", phone: "9876543210" }).success).toBe(false);
  });
});

describe("product", () => {
  it("takes its price as whole paise", () => {
    const parsed = createProductSchema.parse({ name: "Brownie", defaultPrice: 8000 });
    expect(parsed.defaultPrice).toBe(8000);
    expect(parsed.unit).toBe("piece");
    expect(parsed.isActive).toBe(true);
  });

  it("refuses a fractional price — money is never a float", () => {
    expect(createProductSchema.safeParse({ name: "Brownie", defaultPrice: 80.5 }).success).toBe(false);
  });

  it("the form takes rupees and hands over paise", () => {
    const parsed = productFormSchema.parse({
      name: "Brownie",
      description: "",
      defaultPrice: "80.50",
      unit: "piece",
      isActive: true,
    });
    expect(parsed.defaultPrice).toBe(8050);
  });
});

describe("expense", () => {
  it("the form takes rupees and hands over paise", () => {
    const parsed = expenseFormSchema.parse({
      category: "Ingredients",
      description: "Flour",
      amount: "250",
      expenseDate: "2026-09-22",
      paymentMethod: "CASH",
    });
    expect(parsed.amount).toBe(25000);
  });

  it("refuses a category the database would not accept", () => {
    expect(
      createExpenseSchema.safeParse({
        category: "Fireworks",
        description: "x",
        amount: 100,
        expenseDate: "2026-09-22",
        paymentMethod: "CASH",
      }).success,
    ).toBe(false);
  });
});

describe("inventory", () => {
  it("insists stock in adds and wastage takes away", () => {
    expect(
      logInventoryTransactionSchema.safeParse({ productId: UUID, type: "STOCK_IN", quantity: 5 }).success,
    ).toBe(true);
    expect(
      logInventoryTransactionSchema.safeParse({ productId: UUID, type: "STOCK_IN", quantity: -5 }).success,
    ).toBe(false);
    expect(
      logInventoryTransactionSchema.safeParse({ productId: UUID, type: "WASTAGE", quantity: 5 }).success,
    ).toBe(false);
  });

  it("lets an adjustment go either way, but not nowhere", () => {
    expect(
      logInventoryTransactionSchema.safeParse({ productId: UUID, type: "ADJUSTMENT", quantity: -2 }).success,
    ).toBe(true);
    expect(
      logInventoryTransactionSchema.safeParse({ productId: UUID, type: "ADJUSTMENT", quantity: 0 }).success,
    ).toBe(false);
  });

  it("only offers a baker the movements that are theirs to record", () => {
    expect(stockAdjustmentFormSchema.safeParse({ type: "ORDER_RESERVATION", quantity: "1" }).success).toBe(
      false,
    );
  });

  it("works out which way a movement goes, so nobody types a minus sign", () => {
    expect(signedQuantity("STOCK_IN", 5)).toBe(5);
    expect(signedQuantity("RETURN", -5)).toBe(5);
    expect(signedQuantity("WASTAGE", 5)).toBe(-5);
    expect(signedQuantity("ADJUSTMENT", -2)).toBe(-2);
  });
});

describe("order", () => {
  const validOrder = {
    customerId: UUID,
    items: [{ productId: OTHER_UUID, quantity: 2 }],
    delivery: { type: "PICKUP", date: "2026-09-23T10:00:00.000Z" },
    payment: { status: "UNPAID" },
  };

  it("needs at least one item", () => {
    expect(createOrderSchema.safeParse({ ...validOrder, items: [] }).success).toBe(false);
  });

  it("defaults to no adjustments", () => {
    expect(createOrderSchema.parse(validOrder).adjustments).toEqual([]);
  });

  it("refuses a negative adjustment — the type says which way it goes", () => {
    expect(
      createOrderSchema.safeParse({
        ...validOrder,
        adjustments: [{ type: "CHARGE", name: "Delivery", amount: -100 }],
      }).success,
    ).toBe(false);
  });

  it("the form turns a local date and time into the instant that is stored", () => {
    const parsed = orderFormSchema.parse({
      customerId: UUID,
      items: [{ productId: OTHER_UUID, quantity: 1, notes: "" }],
      adjustments: [{ type: "CHARGE", name: "Delivery", amount: "40" }],
      delivery: { type: "DELIVERY", date: "2026-09-23T10:00", address: "12 Lane", googleMapsLink: "" },
      payment: { status: "UNPAID", reference: "" },
      notes: "",
    });

    expect(parsed.delivery.date).toBe(new Date("2026-09-23T10:00").toISOString());
    expect(parsed.adjustments[0].amount).toBe(4000);
  });

  it("a status change may name either status, or both", () => {
    expect(updateOrderStatusSchema.parse({ status: "DELIVERED" })).toEqual({ status: "DELIVERED" });
    expect(updateOrderStatusSchema.safeParse({ status: "SHIPPED" }).success).toBe(false);
  });
});

describe("payment", () => {
  it("crosses the wire as whole paise", () => {
    const parsed = createPaymentSchema.parse({
      order_id: UUID,
      amount: 50000,
      payment_method: "UPI",
    });
    expect(parsed.amount).toBe(50000);
  });

  it("refuses a payment of nothing", () => {
    expect(
      createPaymentSchema.safeParse({ order_id: UUID, amount: 0, payment_method: "UPI" }).success,
    ).toBe(false);
  });

  it("the form takes rupees and hands over paise", () => {
    expect(paymentFormSchema.parse({ amount: "499.50", payment_method: "CASH", reference: "" })).toEqual({
      amount: 49950,
      payment_method: "CASH",
      reference: null,
    });
  });
});
