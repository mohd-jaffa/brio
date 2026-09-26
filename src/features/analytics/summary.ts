import { UI_TEXT } from "@/constants/messages";
import { ORDER_STATUSES, type DeliveryType, type OrderStatus } from "@/constants/statuses";
import { dayKey } from "@/lib/dates/calendar";
import { bucketIndex, bucketStarts, type Interval, type Period } from "@/lib/dates/range";

import type { Figure, ProductSales, TopCustomer } from "./types";

/**
 * The sums behind Analytics (plan §139.10, §139.11.11), kept apart from the
 * query that feeds them so each is tested on plain rows. Days are the
 * business's days.
 */

/** How many top customers the Customers tab ranks. */
export const TOP_CUSTOMERS = 10;

/** An order as the report reads it. */
export interface ReportOrder {
  total: number;
  status: OrderStatus;
  created_at: string;
  delivery_type: DeliveryType;
  customer_id: string | null;
  customers: { id: string; name: string; created_at: string } | null;
  order_items: {
    product_id: string | null;
    product_name: string;
    quantity: number;
    subtotal: number;
    products: { icon_key: string | null } | null;
  }[];
  payments: { amount: number }[];
}

const within = (period: Period, instant: string) => {
  const day = dayKey(instant);
  return day >= period.from && day <= period.to;
};

/** The orders placed in a period. */
export function placedIn<T extends { created_at: string }>(orders: readonly T[], period: Period): T[] {
  return orders.filter((order) => within(period, order.created_at));
}

/** The orders that count as sales: every one but a cancelled one. */
export function counted<T extends { status: OrderStatus }>(orders: readonly T[]): T[] {
  return orders.filter((order) => order.status !== "CANCELLED");
}

const sales = (orders: readonly { total: number }[]) => orders.reduce((sum, order) => sum + order.total, 0);

/** The four headline figures, each with the period before's (IMP-10). */
export function headlineFigures(
  current: readonly ReportOrder[],
  previous: readonly ReportOrder[],
  newCustomers: Figure,
): { sales: Figure; orders: Figure; newCustomers: Figure; averageOrder: Figure } {
  const now = counted(current);
  const then = counted(previous);
  const average = (orders: readonly ReportOrder[]) => (orders.length === 0 ? 0 : Math.round(sales(orders) / orders.length));
  return {
    sales: { value: sales(now), previous: sales(then) },
    orders: { value: now.length, previous: then.length },
    newCustomers,
    averageOrder: { value: average(now), previous: average(then) },
  };
}

/** A value summed into each group of a period, from the orders placed in it. */
export function trend<T extends { created_at: string }>(
  orders: readonly T[],
  period: Period,
  interval: Interval,
  value: (order: T) => number,
): { start: string; value: number }[] {
  const groups = bucketStarts(period, interval).map((start) => ({ start, value: 0 }));
  for (const order of orders) {
    const index = bucketIndex(period, interval, dayKey(order.created_at));
    if (index >= 0) groups[index].value += value(order);
  }
  return groups;
}

/** Sales by group, with the period before's at the same place — nothing where it had no such group. */
export function salesTrend(
  current: readonly ReportOrder[],
  previous: readonly ReportOrder[],
  period: Period,
  before: Period,
  interval: Interval,
): { start: string; value: number; previous: number }[] {
  const then = trend(counted(previous), before, interval, (order) => order.total);
  return trend(counted(current), period, interval, (order) => order.total).map((group, index) => ({
    ...group,
    previous: then[index]?.value ?? 0,
  }));
}

/** Every product sold, by what it took, then how many; custom items as one line (plan §139.10). */
export function productSales(orders: readonly ReportOrder[]): ProductSales[] {
  const lines = new Map<string, ProductSales & { seen: Set<ReportOrder> }>();
  for (const order of counted(orders)) {
    for (const item of order.order_items) {
      const key = item.product_id ?? "custom";
      const line = lines.get(key) ?? {
        productId: item.product_id,
        name: item.product_id === null ? UI_TEXT.analytics.customItems : item.product_name,
        iconKey: item.products?.icon_key ?? null,
        orders: 0,
        quantity: 0,
        sales: 0,
        seen: new Set<ReportOrder>(),
      };
      line.seen.add(order);
      line.orders = line.seen.size;
      line.quantity += item.quantity;
      line.sales += item.subtotal;
      lines.set(key, line);
    }
  }
  return [...lines.values()]
    .map(({ productId, name, iconKey, orders, quantity, sales }) => ({ productId, name, iconKey, orders, quantity, sales }))
    .sort((a, b) => b.sales - a.sales || b.quantity - a.quantity || a.name.localeCompare(b.name));
}

/** How many orders stand at each status, in the order an order passes through them; none left out. */
export function statusCounts(orders: readonly ReportOrder[]): { status: OrderStatus; count: number }[] {
  return ORDER_STATUSES.map((status) => ({ status, count: orders.filter((order) => order.status === status).length })).filter(
    (entry) => entry.count > 0,
  );
}

/** Orders collected in person against orders delivered. */
export function handover(orders: readonly ReportOrder[]): { pickup: number; delivery: number } {
  const kept = counted(orders);
  const pickup = kept.filter((order) => order.delivery_type === "PICKUP").length;
  return { pickup, delivery: kept.length - pickup };
}

/** What Guests bought, and what saved customers bought (plan §139.11.3). */
export function guestSplit(orders: readonly ReportOrder[]): { guest: number; customers: number } {
  const kept = counted(orders);
  return {
    guest: sales(kept.filter((order) => order.customer_id === null)),
    customers: sales(kept.filter((order) => order.customer_id !== null)),
  };
}

/** Of the period's sales, what has been paid and what is still owed. */
export function collection(orders: readonly ReportOrder[]): { collected: number; toCollect: number } {
  let collected = 0;
  let toCollect = 0;
  for (const order of counted(orders)) {
    const paid = Math.min(order.total, order.payments.reduce((sum, payment) => sum + payment.amount, 0));
    collected += paid;
    toCollect += order.total - paid;
  }
  return { collected, toCollect };
}

/** The customers who ordered in the period: added within it, or before it. */
export function customerMix(orders: readonly ReportOrder[], period: Period): { new: number; returning: number } {
  const customers = new Map<string, boolean>();
  for (const order of counted(orders)) {
    if (order.customers) customers.set(order.customers.id, within(period, order.customers.created_at));
  }
  const added = [...customers.values()].filter(Boolean).length;
  return { new: added, returning: customers.size - added };
}

/** The customers who spent most, Guests left out (§133.9 I1). */
export function topCustomers(orders: readonly ReportOrder[]): TopCustomer[] {
  const customers = new Map<string, TopCustomer>();
  for (const order of counted(orders)) {
    if (!order.customers) continue;
    const entry = customers.get(order.customers.id) ?? { id: order.customers.id, name: order.customers.name, orders: 0, spent: 0 };
    entry.orders += 1;
    entry.spent += order.total;
    customers.set(order.customers.id, entry);
  }
  return [...customers.values()]
    .sort((a, b) => b.spent - a.spent || b.orders - a.orders || a.name.localeCompare(b.name))
    .slice(0, TOP_CUSTOMERS);
}

/** How a figure moved on the period before, in whole percent; nothing to say when there was nothing before. */
export function percentChange(figure: Figure): number | undefined {
  if (figure.previous === 0) return undefined;
  return Math.round(((figure.value - figure.previous) / figure.previous) * 100);
}
