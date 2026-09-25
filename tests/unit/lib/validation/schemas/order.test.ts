import { describe, expect, it } from "vitest";

import { VALIDATION_MESSAGES } from "@/constants/messages";
import {
  createOrderSchema,
  customItemFormSchema,
  GUEST_CHOICE,
  orderFormSchema,
  orderListQuerySchema,
  orderPaymentFormSchema,
  orderPaymentSchema,
  updateOrderStatusSchema,
} from "@/lib/validation/index";

describe("payment when the order is placed (§139.11.9)", () => {
  it("is unpaid, paid in full, or part paid with the amount", () => {
    expect(orderPaymentSchema.parse({ status: "UNPAID", method: "CASH" })).toEqual({ status: "UNPAID" });
    expect(orderPaymentSchema.parse({ status: "PAID", method: "UPI" })).toEqual({ status: "PAID", method: "UPI", reference: null });
    expect(orderPaymentSchema.parse({ status: "PARTIALLY_PAID", amount: 50000, method: "CASH", reference: " R-1 " })).toEqual({
      status: "PARTIALLY_PAID",
      amount: 50000,
      method: "CASH",
      reference: "R-1",
    });
  });

  it("asks part paid for its amount, and anything paid for its method", () => {
    const part = orderPaymentSchema.safeParse({ status: "PARTIALLY_PAID", method: "CASH" });
    expect(part.error?.issues[0]).toMatchObject({ path: ["amount"], message: VALIDATION_MESSAGES.amount("Amount paid") });
    const paid = orderPaymentSchema.safeParse({ status: "PAID" });
    expect(paid.error?.issues[0].message).toBe(VALIDATION_MESSAGES.chooseOne("payment method"));
    expect(orderPaymentSchema.safeParse({ status: "PAID_LATER" }).error?.issues[0].message).toBe(
      VALIDATION_MESSAGES.chooseOne("payment status"),
    );
  });

  it("the form reads the part amount in rupees, and asks for it only when part paid", () => {
    expect(orderPaymentFormSchema.parse({ status: "PARTIALLY_PAID", method: "UPI", reference: "", amount: "₹1,500" })).toEqual({
      status: "PARTIALLY_PAID",
      amount: 150000,
      method: "UPI",
      reference: null,
    });
    expect(orderPaymentFormSchema.parse({ status: "UNPAID", method: "UPI", reference: "", amount: "" })).toEqual({ status: "UNPAID" });
    for (const [amount, message] of [
      ["", VALIDATION_MESSAGES.required("Amount paid")],
      ["0", VALIDATION_MESSAGES.moreThanZero("Amount paid")],
      ["lots", VALIDATION_MESSAGES.amount("Amount paid")],
    ]) {
      const result = orderPaymentFormSchema.safeParse({ status: "PARTIALLY_PAID", method: "UPI", reference: "", amount });
      expect(result.error?.issues[0]).toMatchObject({ path: ["amount"], message });
    }
  });
});

const UUID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const OTHER_UUID = "9f1c8a52-3d66-4a1e-8b0a-6d1f0f3a2b77";

describe("order", () => {
  const validOrder = {
    customer: { kind: "CUSTOMER", id: UUID },
    items: [{ productId: OTHER_UUID, quantity: 2 }],
    delivery: { type: "PICKUP", date: "2026-09-23T10:00:00.000Z" },
    payment: { status: "UNPAID" },
  };

  it("names the customer out loud — a saved one, or Guest (§139.11.3)", () => {
    expect(createOrderSchema.parse(validOrder).customer).toEqual({ kind: "CUSTOMER", id: UUID });
    expect(createOrderSchema.parse({ ...validOrder, customer: { kind: "GUEST" } }).customer).toEqual({ kind: "GUEST" });
  });

  it("never takes a missing customer, or a bare null, as Guest", () => {
    for (const customer of [undefined, null, {}, { kind: "CUSTOMER" }, { kind: "CUSTOMER", id: null }, { kind: "SOMEONE" }]) {
      const result = createOrderSchema.safeParse({ ...validOrder, customer });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(VALIDATION_MESSAGES.chooseOne("customer"));
    }
  });

  it("filters the list by guest, or by one customer, and nothing else", () => {
    expect(orderListQuerySchema.parse({ customer: "guest" })).toEqual({ customer: "guest" });
    expect(orderListQuerySchema.parse({ customer: UUID })).toEqual({ customer: UUID });
    expect(orderListQuerySchema.parse({})).toEqual({});
    expect(orderListQuerySchema.safeParse({ customer: "everyone" }).success).toBe(false);
  });

  it("takes a custom line — a name and the price of one — beside catalogue lines (§139.11.7)", () => {
    const parsed = createOrderSchema.parse({
      ...validOrder,
      items: [...validOrder.items, { custom: { name: "  Name   topper ", unitPrice: 15000 }, quantity: 1 }],
    });
    expect(parsed.items[1]).toEqual({ custom: { name: "Name topper", unitPrice: 15000 }, quantity: 1, notes: null });
  });

  it("refuses a custom line with a short name or no price, in its own words", () => {
    const result = createOrderSchema.safeParse({
      ...validOrder,
      items: [{ custom: { name: "x", unitPrice: 0 }, quantity: 1 }],
    });
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      VALIDATION_MESSAGES.tooShort("Item name", 2),
      VALIDATION_MESSAGES.moreThanZero("Amount"),
    ]);
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual(["items.0.custom.name", "items.0.custom.unitPrice"]);
  });

  it("reports a catalogue line's mistake against the catalogue line", () => {
    const result = createOrderSchema.safeParse({ ...validOrder, items: [{ productId: "nope", quantity: 0 }] });
    expect(result.error?.issues.map((issue) => [issue.path.join("."), issue.message])).toEqual([
      ["items.0.productId", VALIDATION_MESSAGES.invalid],
      ["items.0.quantity", VALIDATION_MESSAGES.moreThanZero("Quantity")],
    ]);
  });

  it("the custom-item sheet reads the amount as it is written, above ₹0", () => {
    expect(customItemFormSchema.parse({ name: "Cake topper", unitPrice: "₹1,250" })).toEqual({ name: "Cake topper", unitPrice: 125000 });
    expect(customItemFormSchema.safeParse({ name: "Cake topper", unitPrice: "0" }).error?.issues[0].message).toBe(
      VALIDATION_MESSAGES.moreThanZero("Amount"),
    );
    expect(customItemFormSchema.safeParse({ name: "", unitPrice: "10" }).error?.issues[0].message).toBe(
      VALIDATION_MESSAGES.required("Item name"),
    );
  });

  it("sends a delivery somewhere: an address, a map link, or both (§96, BUG-22)", () => {
    const delivery = (address?: string, googleMapsLink?: string) =>
      createOrderSchema.safeParse({ ...validOrder, delivery: { type: "DELIVERY", date: validOrder.delivery.date, address, googleMapsLink } });

    expect(delivery("12 MG Road").success).toBe(true);
    expect(delivery(undefined, "https://maps.app.goo.gl/xyz").success).toBe(true);
    for (const result of [delivery(), delivery("   ", "")]) {
      expect(result.error?.issues).toEqual([
        expect.objectContaining({ path: ["delivery", "address"], message: VALIDATION_MESSAGES.deliveryNeedsPlace }),
      ]);
    }
  });

  it("lets a pickup go without either", () => {
    expect(createOrderSchema.safeParse(validOrder).success).toBe(true);
  });

  it("the form holds a delivery to the same rule", () => {
    const result = orderFormSchema.safeParse({
      customerId: UUID,
      items: [{ productId: OTHER_UUID, quantity: 1, notes: "" }],
      adjustments: [],
      delivery: { type: "DELIVERY", date: "2026-09-23T10:00", address: "", googleMapsLink: "" },
      payment: { status: "UNPAID", method: "CASH", reference: "" },
      notes: "",
    });
    expect(result.error?.issues[0]).toMatchObject({ path: ["delivery", "address"], message: VALIDATION_MESSAGES.deliveryNeedsPlace });
  });

  it("names the map link as a map link, whichever service it is from", () => {
    const result = createOrderSchema.safeParse({
      ...validOrder,
      delivery: { ...validOrder.delivery, googleMapsLink: "javascript:alert(1)" },
    });
    expect(result.error?.issues[0].message).toBe(VALIDATION_MESSAGES.url("Map link"));
  });

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
      payment: { status: "UNPAID", method: "CASH", reference: "" },
      notes: "",
    });

    expect(parsed.delivery.date).toBe(new Date("2026-09-23T10:00").toISOString());
    expect(parsed.adjustments[0].amount).toBe(4000);
    expect(parsed.customer).toEqual({ kind: "CUSTOMER", id: UUID });
    expect(parsed).not.toHaveProperty("customerId");
  });

  it("the form sends its Guest choice as a Guest", () => {
    const parsed = orderFormSchema.parse({
      customerId: GUEST_CHOICE,
      items: [{ productId: OTHER_UUID, quantity: 1, notes: "" }],
      adjustments: [],
      delivery: { type: "PICKUP", date: "2026-09-23T10:00", address: "", googleMapsLink: "" },
      payment: { status: "UNPAID", method: "CASH", reference: "" },
      notes: "",
    });
    expect(parsed.customer).toEqual({ kind: "GUEST" });
  });

  it("a status change may name either status, or both", () => {
    expect(updateOrderStatusSchema.parse({ status: "DELIVERED" })).toEqual({ status: "DELIVERED" });
    expect(updateOrderStatusSchema.safeParse({ status: "SHIPPED" }).success).toBe(false);
  });
});
