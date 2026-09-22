import { z } from "zod";
import { VALIDATION_MESSAGES } from "@/constants/messages";
import { type InventoryTransactionType } from "@/features/inventory/types";

export const logInventoryTransactionSchema = z.object({
  productId: z.string().uuid(VALIDATION_MESSAGES.invalid),
  type: z.enum([
    "STOCK_IN",
    "ORDER_RESERVATION",
    "ORDER_CONSUMPTION",
    "ADJUSTMENT",
    "WASTAGE",
    "RETURN",
  ]) as z.ZodType<InventoryTransactionType>,
  quantity: z.number().int(VALIDATION_MESSAGES.wholeNumber("Quantity")),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
}).refine((data) => {
  // Enforce logical sign conventions:
  // Additions to stock
  if (["STOCK_IN", "RETURN"].includes(data.type)) {
    return data.quantity > 0;
  }
  // Subtractions from stock
  if (["ORDER_RESERVATION", "ORDER_CONSUMPTION", "WASTAGE"].includes(data.type)) {
    return data.quantity < 0;
  }
  // ADJUSTMENT can be either positive or negative, but shouldn't be 0
  if (data.type === "ADJUSTMENT") {
    return data.quantity !== 0;
  }
  return false;
}, {
  message: VALIDATION_MESSAGES.invalid,
  path: ["quantity"],
});

export type LogInventoryTransactionInput = z.input<typeof logInventoryTransactionSchema>;
