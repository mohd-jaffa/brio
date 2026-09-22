import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
  type StatusTone,
} from "@/constants/statuses";

import type { Order } from "./types";

/**
 * How an order reads on a screen. The list, the detail page and the dashboard
 * each worked this out for themselves, and had ended up disagreeing about when
 * an order counts as late and what colour a status is.
 */
export const OPEN_STATUSES = ["PENDING", "IN_PROGRESS", "IN_TRANSIT"] as const;

/** An order still being worked on, as opposed to one delivered or cancelled. */
export function isOpen(order: Order): boolean {
  return (OPEN_STATUSES as readonly string[]).includes(order.status);
}

/** Past its delivery time and still open. A delivered or cancelled order is never late. */
export function isOverdue(order: Order, now: Date = new Date()): boolean {
  return isOpen(order) && new Date(order.delivery.date).getTime() < now.getTime();
}

/** What the badge beside an order says, and in what tone — "Overdue" outranks the status. */
export function statusBadge(order: Order, now?: Date): { label: string; tone: StatusTone } {
  if (isOverdue(order, now)) return { label: "Overdue", tone: "danger" };
  return { label: ORDER_STATUS_LABELS[order.status], tone: ORDER_STATUS_TONES[order.status] };
}

export function paymentBadge(order: Order): { label: string; tone: StatusTone } {
  return {
    label: PAYMENT_STATUS_LABELS[order.payment.status],
    tone: PAYMENT_STATUS_TONES[order.payment.status],
  };
}

/** Open orders soonest first; finished ones most recent first (plan §20). */
export function byDueDate(orders: readonly Order[], open: boolean): Order[] {
  return [...orders].sort((a, b) => {
    const left = new Date(a.delivery.date).getTime();
    const right = new Date(b.delivery.date).getTime();
    return open ? left - right : right - left;
  });
}
