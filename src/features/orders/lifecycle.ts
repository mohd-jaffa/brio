import {
  DELIVERY_ONLY_STATUSES,
  FINAL_STATUSES,
  OPEN_STATUSES,
  ORDER_STATUS_TRANSITIONS,
  type DeliveryType,
  type OrderStatus,
} from "@/constants/statuses";

/**
 * How an order may move (plan §139.11.8), for the screen: its next-step button
 * and the moves in its menu. The database refuses anything else
 * (`order_status_next`, 0025_edit_orders.sql), and posts the stock a move
 * brings.
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

/** Delivered or Cancelled: nothing moves or changes it after this. */
export function isFinal(status: OrderStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

/** A move to an earlier open status: putting right a move made by mistake. */
export function movesBack(from: OrderStatus, to: OrderStatus): boolean {
  const rank = (status: OrderStatus) => (OPEN_STATUSES as readonly OrderStatus[]).indexOf(status);
  return !isFinal(to) && rank(to) < rank(from);
}
