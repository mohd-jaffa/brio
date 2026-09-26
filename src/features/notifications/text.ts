import { UI_TEXT } from "@/constants/messages";
import {
  DELIVERY_TYPES,
  ORDER_STATUSES,
  orderStatusLabel,
  type DeliveryType,
  type NotificationKind,
  type OrderStatus,
} from "@/constants/statuses";
import { formatPaise } from "@/lib/format/currency";
import { formatDayMonth } from "@/lib/format/date";
import { formatQuantity } from "@/lib/format/quantity";

import type { NotificationPayload } from "./types";

/**
 * What happened, as a job carries it: facts, never words. The words are
 * written here when the notification is sent, from messages.ts, so a stored
 * status or an amount in paise never reaches a person (BUG-26) — "ORD-1028 is
 * now Ready.", "₹500 received for ORD-1028."
 *
 * The order's id came later than its number: a job queued before it has
 * none, and its notification leads nowhere.
 */
export type NotificationMessage =
  | { kind: "ORDER_PLACED"; orderId: string; orderNumber: string; customerName: string | null }
  | { kind: "ORDER_STATUS"; orderId?: string; orderNumber: string; status: OrderStatus; deliveryType: DeliveryType }
  | { kind: "ORDER_DUE"; orderId: string; orderNumber: string; customerName: string | null; day: DueDay }
  | { kind: "ORDER_OVERDUE"; orderId: string; orderNumber: string; customerName: string | null; dueDate: string }
  | { kind: "PAYMENT_RECEIVED"; orderId?: string; orderNumber: string; amount: number }
  | { kind: "CUSTOMER_ADDED"; customerId: string; name: string }
  | { kind: "STOCK_LOW"; productId: string; productName: string; balance: number; unit: string };

/** Which day an order due soon is due on, in its business's calendar (0023). */
const DUE_DAYS = ["TODAY", "TOMORROW"] as const;
type DueDay = (typeof DUE_DAYS)[number];

const DUE_DAY_WORDS: Record<DueDay, "today" | "tomorrow"> = { TODAY: "today", TOMORROW: "tomorrow" };

/** Whom an order is for, as its bill says: the customer's name, or Guest. */
const whose = (customerName: string | null) => customerName ?? UI_TEXT.customerPicker.guest;

export function notificationText(message: NotificationMessage): NotificationPayload {
  const { notifications } = UI_TEXT;
  switch (message.kind) {
    case "ORDER_PLACED":
      return {
        title: notifications.orderPlacedTitle,
        body: notifications.orderPlacedBody(message.orderNumber, whose(message.customerName)),
      };
    case "ORDER_DUE":
      return {
        title: notifications.orderDueTitle,
        body: notifications.orderDueBody(message.orderNumber, whose(message.customerName), DUE_DAY_WORDS[message.day]),
      };
    case "ORDER_OVERDUE":
      return {
        title: notifications.orderOverdueTitle,
        body: notifications.orderOverdueBody(message.orderNumber, whose(message.customerName), formatDayMonth(message.dueDate)),
      };
    case "PAYMENT_RECEIVED":
      return {
        title: notifications.paymentTitle,
        body: notifications.paymentBody(formatPaise(message.amount), message.orderNumber),
      };
    case "CUSTOMER_ADDED":
      return { title: notifications.customerAddedTitle, body: notifications.customerAddedBody(message.name) };
    case "STOCK_LOW":
      return {
        title: notifications.stockLowTitle,
        body: notifications.stockLowBody(message.productName, formatQuantity(message.balance, message.unit)),
      };
    case "ORDER_STATUS":
      return {
        title: notifications.orderStatusTitle,
        body: notifications.orderStatusBody(message.orderNumber, orderStatusLabel(message.status, message.deliveryType)),
      };
  }
}

/** Which of the inbox's kinds a message is (plan §139.10). */
export function notificationKind(message: NotificationMessage): NotificationKind {
  switch (message.kind) {
    case "ORDER_PLACED":
    case "ORDER_STATUS":
    case "ORDER_DUE":
    case "ORDER_OVERDUE":
      return "ORDER";
    case "PAYMENT_RECEIVED":
      return "PAYMENT";
    case "CUSTOMER_ADDED":
      return "CUSTOMER";
    case "STOCK_LOW":
      return "STOCK";
  }
}

/** Where tapping it goes: the order, the customer, or the stock list. */
export function notificationLink(message: NotificationMessage): string | null {
  switch (message.kind) {
    case "CUSTOMER_ADDED":
      return `/customers/${message.customerId}`;
    case "STOCK_LOW":
      return "/inventory";
    default:
      return message.orderId ? `/orders/${message.orderId}` : null;
  }
}

const text = (value: unknown): value is string => typeof value === "string" && value !== "";

/** A job's message, if it is one this build can put into words. */
export function readNotificationMessage(value: unknown): NotificationMessage | null {
  if (typeof value !== "object" || value === null) return null;
  const message = value as Record<string, unknown>;

  if (message.kind === "CUSTOMER_ADDED") {
    return text(message.customerId) && text(message.name)
      ? { kind: "CUSTOMER_ADDED", customerId: message.customerId, name: message.name }
      : null;
  }
  if (message.kind === "STOCK_LOW") {
    return text(message.productId) && text(message.productName) && Number.isInteger(message.balance) && text(message.unit)
      ? {
          kind: "STOCK_LOW",
          productId: message.productId,
          productName: message.productName,
          balance: message.balance as number,
          unit: message.unit,
        }
      : null;
  }

  if (!text(message.orderNumber)) return null;
  const orderId = text(message.orderId) ? { orderId: message.orderId } : {};
  if (message.kind === "ORDER_PLACED") {
    return text(message.orderId)
      ? {
          kind: "ORDER_PLACED",
          orderId: message.orderId,
          orderNumber: message.orderNumber,
          customerName: text(message.customerName) ? message.customerName : null,
        }
      : null;
  }
  if (message.kind === "ORDER_DUE" || message.kind === "ORDER_OVERDUE") {
    if (!text(message.orderId)) return null;
    const order = {
      orderId: message.orderId,
      orderNumber: message.orderNumber,
      customerName: text(message.customerName) ? message.customerName : null,
    };
    if (message.kind === "ORDER_DUE") {
      return (DUE_DAYS as readonly unknown[]).includes(message.day)
        ? { kind: "ORDER_DUE", ...order, day: message.day as DueDay }
        : null;
    }
    return typeof message.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(message.dueDate)
      ? { kind: "ORDER_OVERDUE", ...order, dueDate: message.dueDate }
      : null;
  }
  if (message.kind === "PAYMENT_RECEIVED" && Number.isInteger(message.amount)) {
    return { kind: "PAYMENT_RECEIVED", ...orderId, orderNumber: message.orderNumber, amount: message.amount as number };
  }
  if (
    message.kind === "ORDER_STATUS" &&
    (ORDER_STATUSES as readonly unknown[]).includes(message.status) &&
    (DELIVERY_TYPES as readonly unknown[]).includes(message.deliveryType)
  ) {
    return {
      kind: "ORDER_STATUS",
      ...orderId,
      orderNumber: message.orderNumber,
      status: message.status as OrderStatus,
      deliveryType: message.deliveryType as DeliveryType,
    };
  }
  return null;
}
