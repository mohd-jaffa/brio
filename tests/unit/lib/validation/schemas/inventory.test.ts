import { describe, expect, it } from "vitest";

import { VALIDATION_MESSAGES } from "@/constants/messages";
import {
  logInventoryTransactionSchema,
  signedQuantity,
  stockAdjustmentFormSchema,
  stockLedgerQuerySchema,
} from "@/lib/validation/index";

const UUID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

describe("inventory", () => {
  it("insists stock in adds and wastage takes away", () => {
    expect(logInventoryTransactionSchema.safeParse({ productId: UUID, type: "STOCK_IN", quantity: 5 }).success).toBe(
      true,
    );
    expect(logInventoryTransactionSchema.safeParse({ productId: UUID, type: "STOCK_IN", quantity: -5 }).success).toBe(
      false,
    );
    expect(logInventoryTransactionSchema.safeParse({ productId: UUID, type: "WASTAGE", quantity: 5 }).success).toBe(
      false,
    );
  });

  it("lets an adjustment go either way, but not nowhere", () => {
    expect(logInventoryTransactionSchema.safeParse({ productId: UUID, type: "ADJUSTMENT", quantity: -2 }).success).toBe(
      true,
    );
    expect(logInventoryTransactionSchema.safeParse({ productId: UUID, type: "ADJUSTMENT", quantity: 0 }).success).toBe(
      false,
    );
  });

  it("only offers a baker the movements that are theirs to record", () => {
    expect(stockAdjustmentFormSchema.safeParse({ type: "ORDER_RESERVATION", quantity: "1" }).success).toBe(false);
  });

  it("works out which way a movement goes, so nobody types a minus sign", () => {
    expect(signedQuantity("STOCK_IN", 5)).toBe(5);
    expect(signedQuantity("RETURN", -5)).toBe(5);
    expect(signedQuantity("WASTAGE", 5)).toBe(-5);
    expect(signedQuantity("ADJUSTMENT", -2)).toBe(-2);
  });
});

describe("stock ledger query", () => {
  it("takes one product and where the page starts, and nothing else", () => {
    expect(stockLedgerQuerySchema.parse({ product: UUID, cursor: "20" })).toEqual({ product: UUID, cursor: 20 });
    expect(stockLedgerQuerySchema.safeParse({}).success).toBe(false);
    expect(stockLedgerQuerySchema.safeParse({ product: "flour" }).error?.issues[0].message).toBe(
      VALIDATION_MESSAGES.invalid,
    );
  });
});
