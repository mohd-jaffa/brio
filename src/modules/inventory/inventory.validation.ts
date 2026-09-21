import { z } from "zod";
import { type InventoryTransactionType } from "./inventory.types";

export const logInventoryTransactionSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  type: z.enum([
    "STOCK_IN",
    "ORDER_RESERVATION",
    "ORDER_CONSUMPTION",
    "ADJUSTMENT",
    "WASTAGE",
    "RETURN",
  ]) as z.ZodType<InventoryTransactionType>,
  quantity: z.number().int("Quantity must be an integer"),
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
  message: "Quantity sign does not match transaction type logic (e.g. WASTAGE must be negative, STOCK_IN must be positive)",
  path: ["quantity"],
});

export type LogInventoryTransactionInput = z.input<typeof logInventoryTransactionSchema>;
