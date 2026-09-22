import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/messages";
import {
  INVENTORY_TRANSACTION_TYPES,
  MANUAL_INVENTORY_TYPES,
  STOCK_DECREASING_TYPES,
  STOCK_INCREASING_TYPES,
  type InventoryTransactionType,
} from "@/constants/statuses";

import { optionalText, wholeNumberText } from "../primitives";

/** Which way a transaction of each type must move stock (AGENTS.md §14). */
function signIsRight(type: InventoryTransactionType, quantity: number): boolean {
  if ((STOCK_INCREASING_TYPES as readonly string[]).includes(type)) return quantity > 0;
  if ((STOCK_DECREASING_TYPES as readonly string[]).includes(type)) return quantity < 0;
  // An adjustment may go either way, but never nowhere.
  return quantity !== 0;
}

/**
 * One line of the inventory ledger. Stock is never read, calculated and
 * written back: a movement is appended, and the balance is the sum of them.
 */
export const logInventoryTransactionSchema = z
  .object({
    productId: z.string().uuid(VALIDATION_MESSAGES.invalid),
    type: z.enum(INVENTORY_TRANSACTION_TYPES),
    quantity: z.number().int(VALIDATION_MESSAGES.wholeNumber("Quantity")),
    referenceType: optionalText(50, "Reference type"),
    referenceId: optionalText(64, "Reference"),
  })
  .refine((line) => signIsRight(line.type, line.quantity), {
    message: VALIDATION_MESSAGES.invalid,
    path: ["quantity"],
  });

export type LogInventoryTransactionInput = z.input<typeof logInventoryTransactionSchema>;
export type LogInventoryTransactionPayload = z.output<typeof logInventoryTransactionSchema>;

/**
 * A movement a baker records by hand. Only the types that are theirs to record
 * are offered — a reservation and a consumption are posted by the order flow.
 * The quantity is typed as a plain count; which way it moves stock follows
 * from the type, so nobody has to think in minus signs.
 */
export const stockAdjustmentFormSchema = z.object({
  type: z.enum(MANUAL_INVENTORY_TYPES),
  quantity: wholeNumberText("Quantity").refine(
    (quantity) => quantity !== 0,
    VALIDATION_MESSAGES.moreThanZero("Quantity"),
  ),
});

export type StockAdjustmentFormValues = z.input<typeof stockAdjustmentFormSchema>;
export type StockAdjustmentFormPayload = z.output<typeof stockAdjustmentFormSchema>;

/**
 * The signed quantity a movement of this type must be written with: stock in
 * and returns add, wastage takes away, and an adjustment goes the way it was
 * typed.
 */
export function signedQuantity(type: StockAdjustmentFormPayload["type"], quantity: number): number {
  if ((STOCK_INCREASING_TYPES as readonly string[]).includes(type)) return Math.abs(quantity);
  if ((STOCK_DECREASING_TYPES as readonly string[]).includes(type)) return -Math.abs(quantity);
  return quantity;
}
