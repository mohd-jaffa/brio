import { UI_TEXT } from "@/constants/messages";
import {
  DELIVERY_TYPES,
  ORDER_STATUSES,
  orderStatusLabel,
  type DeliveryType,
  type OrderStatus,
} from "@/constants/statuses";
import { formatPaise } from "@/lib/format/currency";

import type { NotificationPayload } from "./types";

/**
 * What happened, as a job carries it: facts, never words. The words are
 * written here when the notification is sent, from messages.ts, so a stored
 * status or an amount in paise never reaches a person (BUG-26) — "ORD-1028 is
 * now Ready.", "₹500 received for ORD-1028."
 */
export type NotificationMessage =
  | { kind: "ORDER_STATUS"; orderNumber: string; status: OrderStatus; deliveryType: DeliveryType }
  | { kind: "PAYMENT_RECEIVED"; orderNumber: string; amount: number };

export function notificationText(message: NotificationMessage): NotificationPayload {
  const { notifications } = UI_TEXT;
  if (message.kind === "PAYMENT_RECEIVED") {
    return {
      title: notifications.paymentTitle,
      body: notifications.paymentBody(formatPaise(message.amount), message.orderNumber),
    };
  }
  return {
    title: notifications.orderStatusTitle,
    body: notifications.orderStatusBody(message.orderNumber, orderStatusLabel(message.status, message.deliveryType)),
  };
}

/** A job's message, if it is one this build can put into words. */
export function readNotificationMessage(value: unknown): NotificationMessage | null {
  if (typeof value !== "object" || value === null) return null;
  const message = value as Record<string, unknown>;
  if (typeof message.orderNumber !== "string") return null;
  if (message.kind === "PAYMENT_RECEIVED" && Number.isInteger(message.amount)) {
    return { kind: "PAYMENT_RECEIVED", orderNumber: message.orderNumber, amount: message.amount as number };
  }
  if (
    message.kind === "ORDER_STATUS" &&
    (ORDER_STATUSES as readonly unknown[]).includes(message.status) &&
    (DELIVERY_TYPES as readonly unknown[]).includes(message.deliveryType)
  ) {
    return {
      kind: "ORDER_STATUS",
      orderNumber: message.orderNumber,
      status: message.status as OrderStatus,
      deliveryType: message.deliveryType as DeliveryType,
    };
  }
  return null;
}
