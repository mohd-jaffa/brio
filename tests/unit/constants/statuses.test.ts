import { describe, expect, it } from "vitest";

import {
  EXPENSE_CATEGORIES,
  INVENTORY_TRANSACTION_LABELS,
  INVENTORY_TRANSACTION_TYPES,
  MANUAL_INVENTORY_TYPES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  ORDER_STATUSES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
  PAYMENT_STATUSES,
  STOCK_DECREASING_TYPES,
  STOCK_INCREASING_TYPES,
} from "@/constants/statuses";

describe("the shared vocabularies", () => {
  it("gives every order status a label and a tone", () => {
    for (const status of ORDER_STATUSES) {
      expect(ORDER_STATUS_LABELS[status]).toBeTruthy();
      expect(ORDER_STATUS_TONES[status]).toBeTruthy();
    }
  });

  it("gives every payment status a label and a tone", () => {
    for (const status of PAYMENT_STATUSES) {
      expect(PAYMENT_STATUS_LABELS[status]).toBeTruthy();
      expect(PAYMENT_STATUS_TONES[status]).toBeTruthy();
    }
  });

  it("gives every payment method a label", () => {
    for (const method of PAYMENT_METHODS) {
      expect(PAYMENT_METHOD_LABELS[method]).toBeTruthy();
    }
  });

  it("gives every ledger movement a label", () => {
    for (const type of INVENTORY_TRANSACTION_TYPES) {
      expect(INVENTORY_TRANSACTION_LABELS[type]).toBeTruthy();
    }
  });

  it("matches the plan's approved ledger movements exactly", () => {
    expect([...INVENTORY_TRANSACTION_TYPES]).toEqual([
      "STOCK_IN",
      "ORDER_RESERVATION",
      "ORDER_CONSUMPTION",
      "ADJUSTMENT",
      "WASTAGE",
      "RETURN",
    ]);
  });

  it("never lets a movement both add to and take from stock", () => {
    const increasing = new Set<string>(STOCK_INCREASING_TYPES);
    expect(STOCK_DECREASING_TYPES.some((type) => increasing.has(type))).toBe(false);
  });

  it("only offers a baker the movements the order flow does not post itself", () => {
    expect(MANUAL_INVENTORY_TYPES).not.toContain("ORDER_RESERVATION");
    expect(MANUAL_INVENTORY_TYPES).not.toContain("ORDER_CONSUMPTION");
  });

  it("keeps the expense categories the database accepts", () => {
    expect(EXPENSE_CATEGORIES).toContain("Ingredients");
    expect(EXPENSE_CATEGORIES).toContain("Other");
  });
});
