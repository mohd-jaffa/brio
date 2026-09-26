import { UI_TEXT } from "@/constants/messages";
import {
  DELIVERY_TYPE_LABELS,
  FINAL_STATUSES,
  ORDER_STATUS_TONES,
  orderStatusLabel,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
  type DeliveryType,
  type OrderStatus,
  type StatusTone,
} from "@/constants/statuses";
import { dueBucket } from "@/lib/dates/calendar";

import type { Order, OrderListItem } from "./types";

/**
 * How an order reads on a screen. The list, the detail page and the dashboard
 * each worked this out for themselves, and had ended up disagreeing about when
 * an order counts as late and what colour a status is.
 */
/** An order still being worked on, as opposed to one delivered or cancelled. */
export function isOpen(order: Order): boolean {
  return !FINAL_STATUSES.includes(order.status);
}

/**
 * Due on a day already gone, and still open. An order due today is not late
 * until the day ends (IMP-05); a delivered or cancelled order is never late.
 */
export function isOverdue(order: Order, now: Date = new Date()): boolean {
  return isOpen(order) && dueBucket(order.delivery.date, now) === "overdue";
}

function pill(status: OrderStatus, deliveryType: DeliveryType, due: string, now?: Date) {
  const late = !FINAL_STATUSES.includes(status) && dueBucket(due, now) === "overdue";
  if (late) return { label: UI_TEXT.orders.overdue, tone: "cancelled" as StatusTone };
  return { label: orderStatusLabel(status, deliveryType), tone: ORDER_STATUS_TONES[status] };
}

/** What the pill beside an order says, and in what tone — "Overdue" outranks the status. */
export function statusPill(order: Order, now?: Date): { label: string; tone: StatusTone } {
  return pill(order.status, order.delivery.type, order.delivery.date, now);
}

/** The same pill for an order in a list (./types `OrderListItem`). */
export function listStatusPill(order: OrderListItem, now?: Date): { label: string; tone: StatusTone } {
  return pill(order.status, order.deliveryType, order.dueAt, now);
}

export function paymentPill(order: Order): { label: string; tone: StatusTone } {
  return {
    label: PAYMENT_STATUS_LABELS[order.payment.status],
    tone: PAYMENT_STATUS_TONES[order.payment.status],
  };
}

/** "SAME_DAY" → "Same day": a stored code put into words. */
function codeAsWords(code: string): string {
  const words = code.toLowerCase().replace(/_+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * How an order is handed over — "Pickup" or "Delivery" — never the stored
 * code. A code this build does not know (a newer server answering an app
 * still cached on a phone) is still put into words rather than shown raw.
 */
export function deliveryLabel(order: Order): string {
  const labels: Partial<Record<string, string>> = DELIVERY_TYPE_LABELS;
  return labels[order.delivery.type] ?? codeAsWords(order.delivery.type);
}

/** Open orders soonest first; finished ones most recent first (plan §20). */
export function byDueDate(orders: readonly Order[], open: boolean): Order[] {
  return [...orders].sort((a, b) => {
    const left = new Date(a.delivery.date).getTime();
    const right = new Date(b.delivery.date).getTime();
    return open ? left - right : right - left;
  });
}

/**
 * What is still owed on an order, in whole paise: its total less what has been
 * paid. The payments are the truth (plan §139.11.9): an order placed as paid
 * records its payment (0015_create_order.sql). A cancelled order owes nothing.
 */
export function balanceDue(order: Order): number {
  if (order.status === "CANCELLED") return 0;
  return Math.max(0, order.pricing.total - order.payment.paid);
}
