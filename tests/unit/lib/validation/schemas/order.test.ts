import { describe, expect, it } from "vitest";

import {
  createOrderSchema,
  orderFormSchema,
  updateOrderStatusSchema,
} from "@/lib/validation/index";

const UUID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const OTHER_UUID = "9f1c8a52-3d66-4a1e-8b0a-6d1f0f3a2b77";

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
