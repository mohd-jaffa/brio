import { sumPaise } from "@/lib/money";

/**
 * What an order comes to. The server works this out from the products it reads
 * back and it is the only number that counts (AGENTS.md §13); the checkout
 * screen shows the same sum as it is being built so nothing changes under the
 * baker at the last step. One formula, used by both.
 */
export interface PricedLine {
  /** Whole paise. */
  unitPrice: number;
  quantity: number;
}

export interface Adjustment {
  type: "DISCOUNT" | "CHARGE";
  /** Whole paise, never negative — the type says which way it goes. */
  amount: number;
}

export interface OrderTotals {
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  tax: number;
  total: number;
}

export function lineSubtotal(line: PricedLine): number {
  return line.unitPrice * line.quantity;
}

export function orderTotals(lines: readonly PricedLine[], adjustments: readonly Adjustment[]): OrderTotals {
  const subtotal = sumPaise(lines.map(lineSubtotal));
  const discount = sumPaise(adjustments.filter((entry) => entry.type === "DISCOUNT").map((entry) => entry.amount));
  const deliveryCharge = sumPaise(adjustments.filter((entry) => entry.type === "CHARGE").map((entry) => entry.amount));
  // No tax is charged yet; the field exists because the order row carries it.
  const tax = 0;

  return { subtotal, discount, deliveryCharge, tax, total: subtotal - discount + deliveryCharge + tax };
}
