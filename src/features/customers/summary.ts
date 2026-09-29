import { NEW_CUSTOMER_DAYS, REGULAR_MIN_ORDERS } from "@/constants/limits";
import type { DeliveryType, OrderStatus } from "@/constants/statuses";
import { addDaysKey, dayStart, todayKey } from "@/lib/dates/calendar";
import { sumPaise } from "@/lib/money";

import type { CustomerAddress, CustomerSegment, CustomerSummary } from "./types";

/** One of a customer's orders, as the summary reads it. */
export interface SummaryOrder {
  total: number;
  status: OrderStatus;
  created_at: string;
  delivery_type: DeliveryType;
  delivery_address: string | null;
  delivery_google_maps_link: string | null;
  payments: { amount: number }[];
}

/**
 * Regular once they have placed three orders, New while they were added in
 * the last 30 days, and neither otherwise (plan §139.10). Regular wins: a
 * customer who ordered three times in their first week is a regular.
 */
export function customerSegment(orders: number, createdAt: string, now: Date = new Date()): CustomerSegment | null {
  if (orders >= REGULAR_MIN_ORDERS) return "REGULAR";
  return Date.parse(createdAt) >= Date.parse(newCustomersSince(now)) ? "NEW" : null;
}

/** When the New segment starts: the beginning of the 30th day back, today counted, in the business's calendar. */
export function newCustomersSince(now: Date = new Date()): string {
  return dayStart(addDaysKey(todayKey(now), -(NEW_CUSTOMER_DAYS - 1)));
}

/** The same place however it was spaced or capitalised, so it is listed once. */
const placeKey = (address: string, link: string) => `${address.toLowerCase().replace(/\s+/g, " ")}|${link}`;

/** The distinct places a customer's deliveries went, most recently used first. */
export function deliveryAddresses(orders: readonly SummaryOrder[]): CustomerAddress[] {
  const places = new Map<string, CustomerAddress>();
  for (const order of orders) {
    if (order.delivery_type !== "DELIVERY") continue;
    const address = order.delivery_address?.trim() ?? "";
    const link = order.delivery_google_maps_link?.trim() ?? "";
    if (!address && !link) continue;
    const key = placeKey(address, link);
    const known = places.get(key);
    if (!known || order.created_at > known.lastUsed) {
      places.set(key, { address, googleMapsLink: link || undefined, lastUsed: order.created_at });
    }
  }
  return [...places.values()].sort((a, b) => b.lastUsed.localeCompare(a.lastUsed));
}

/** A customer's orders summed: cancelled ones count for nothing, and a payment never owes less than nothing. */
export function summarise(orders: readonly SummaryOrder[], createdAt: string, now: Date = new Date()): CustomerSummary {
  const kept = orders.filter((order) => order.status !== "CANCELLED");
  const owed = kept.map((order) =>
    Math.max(0, order.total - sumPaise(order.payments.map((payment) => payment.amount))),
  );
  const last = kept.reduce<string | null>(
    (latest, order) => (latest && latest > order.created_at ? latest : order.created_at),
    null,
  );
  return {
    orders: kept.length,
    spent: sumPaise(kept.map((order) => order.total)),
    balanceDue: sumPaise(owed),
    lastOrderAt: last,
    segment: customerSegment(kept.length, createdAt, now),
    addresses: deliveryAddresses(orders),
  };
}
