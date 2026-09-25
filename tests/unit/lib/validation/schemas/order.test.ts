import { describe, expect, it } from "vitest";

import { VALIDATION_MESSAGES } from "@/constants/messages";
import {
  createOrderSchema,
  customItemFormSchema,
  GUEST_CHOICE,
  orderFormSchema,
  orderListQuerySchema,
  updateOrderStatusSchema,
} from "@/lib/validation/index";

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
    expect(parsed.customer).toEqual({ kind: "CUSTOMER", id: UUID });
    expect(parsed).not.toHaveProperty("customerId");
  });

  it("the form sends its Guest choice as a Guest", () => {
    const parsed = orderFormSchema.parse({
      customerId: GUEST_CHOICE,
      items: [{ productId: OTHER_UUID, quantity: 1, notes: "" }],
      adjustments: [],
      delivery: { type: "PICKUP", date: "2026-09-23T10:00", address: "", googleMapsLink: "" },
      payment: { status: "UNPAID", reference: "" },
      notes: "",
    });
    expect(parsed.customer).toEqual({ kind: "GUEST" });
  });

  it("a status change may name either status, or both", () => {
    expect(updateOrderStatusSchema.parse({ status: "DELIVERED" })).toEqual({ status: "DELIVERED" });
    expect(updateOrderStatusSchema.safeParse({ status: "SHIPPED" }).success).toBe(false);
  });
});
