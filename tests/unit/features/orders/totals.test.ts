import { describe, expect, it } from "vitest";

import { lineSubtotal, orderTotals } from "@/features/orders/totals";

describe("lineSubtotal", () => {
  it("is the price times the count, in whole paise", () => {
    expect(lineSubtotal({ unitPrice: 8050, quantity: 3 })).toBe(24150);
  });
});

describe("orderTotals", () => {
  it("adds the lines up", () => {
    const totals = orderTotals([{ unitPrice: 8000, quantity: 2 }, { unitPrice: 15000, quantity: 1 }], []);
    expect(totals.subtotal).toBe(31000);
    expect(totals.total).toBe(31000);
  });

  it("takes discounts off and adds charges on, by their type rather than their sign", () => {
    const totals = orderTotals(
      [{ unitPrice: 10000, quantity: 1 }],
      [
        { type: "DISCOUNT", amount: 2000 },
        { type: "CHARGE", amount: 4000 },
      ],
    );

    expect(totals.discount).toBe(2000);
    expect(totals.deliveryCharge).toBe(4000);
    expect(totals.total).toBe(12000);
  });

  it("is zero for an order with nothing in it", () => {
    expect(orderTotals([], [])).toEqual({
      subtotal: 0,
      discount: 0,
      deliveryCharge: 0,
      tax: 0,
      total: 0,
    });
  });

  it("can go below zero, so the caller can refuse it rather than storing it", () => {
    expect(orderTotals([{ unitPrice: 1000, quantity: 1 }], [{ type: "DISCOUNT", amount: 5000 }]).total).toBe(
      -4000,
    );
  });

  it("stays exact across many lines — everything is integers", () => {
    const lines = Array.from({ length: 100 }, () => ({ unitPrice: 1999, quantity: 1 }));
    expect(orderTotals(lines, []).total).toBe(199900);
  });
});
