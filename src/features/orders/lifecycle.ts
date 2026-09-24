import {
  DELIVERY_ONLY_STATUSES,
  ORDER_STATUS_TRANSITIONS,
  type DeliveryType,
  type InventoryTransactionType,
  type OrderStatus,
} from "@/constants/statuses";

/**
 * How an order moves, and what moving it does to stock (plan §139.11.8). Pure,
 * so the rules are tested on their own and the server and the screen cannot
 * disagree about them.
 */

/** Where an order of this kind may go from here, in the order a person would take them. */
export function nextStatuses(status: OrderStatus, deliveryType: DeliveryType): OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[status].filter(
    (next) => deliveryType === "DELIVERY" || !DELIVERY_ONLY_STATUSES.includes(next),
  );
}

export function canMoveTo(from: OrderStatus, to: OrderStatus, deliveryType: DeliveryType): boolean {
  return nextStatuses(from, deliveryType).includes(to);
}

export interface StockMovement {
  productId: string;
  type: InventoryTransactionType;
  quantity: number;
}

/**
 * The ledger lines a move to `to` posts for these lines. Placing the order
 * reserved each line (−q). Delivering releases the reservation (+q) and posts
 * the consumption (−q), so the balance does not move a second time (§133.3
 * C5). Cancelling releases the reservation (+q), so the stock is back (BUG-04).
 * A line with no product — a custom item — never touched stock.
 */
export function stockMovements(
  to: OrderStatus,
  lines: readonly { product_id: string | null; quantity: number }[],
): StockMovement[] {
  const stocked = lines.filter(
    (line): line is { product_id: string; quantity: number } => line.product_id !== null,
  );

  if (to === "DELIVERED") {
    return stocked.flatMap((line) => [
      { productId: line.product_id, type: "ORDER_RESERVATION", quantity: line.quantity },
      { productId: line.product_id, type: "ORDER_CONSUMPTION", quantity: -line.quantity },
    ]);
  }
  if (to === "CANCELLED") {
    return stocked.map((line) => ({
      productId: line.product_id,
      type: "ORDER_RESERVATION",
      quantity: line.quantity,
    }));
  }
  return [];
}
