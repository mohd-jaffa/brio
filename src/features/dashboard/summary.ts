import { HOME_LIST_LIMITS, HOME_MIN_TREND_DAYS } from "@/constants/limits";
import { LOW_STOCK_THRESHOLD } from "@/constants/inventory";
import { UI_TEXT } from "@/constants/messages";
import type { HomePeriod } from "@/constants/ranges";
import { ORDER_STATUSES, type OrderStatus } from "@/constants/statuses";
import { addDaysKey, dayKey, dueBucket, monthStartKey, weekStartKey } from "@/lib/dates/calendar";
import type { OrderListItem } from "@/features/orders/types";

import type { DueGroup, LowStockLine, RecentCustomer, TopProduct } from "./types";

/**
 * Home's sums (plan §139.10, §20), apart from the queries that feed them, so
 * each can be tested on plain rows. Everything here is worked out in the
 * business's calendar.
 */

/** Where a period starts, and where its chart starts: the same, or earlier to show a week. */
export function periodDays(period: HomePeriod, today: string): { start: string; chartStart: string } {
  const start = period === "TODAY" ? today : period === "WEEK" ? weekStartKey(today) : monthStartKey(today);
  const weekBack = addDaysKey(today, -(HOME_MIN_TREND_DAYS - 1));
  return { start, chartStart: start < weekBack ? start : weekBack };
}

/** An order as the period's sums read it. */
export interface PeriodOrder {
  total: number;
  status: OrderStatus;
  created_at: string;
  order_items: {
    product_id: string | null;
    product_name: string;
    quantity: number;
    subtotal: number;
    products: { icon_key: string | null } | null;
  }[];
}

const counted = (order: PeriodOrder) => order.status !== "CANCELLED";

/** What the orders placed from `start` come to, cancelled ones left out. */
export function periodSales(orders: readonly PeriodOrder[], start: string): number {
  return orders
    .filter((order) => counted(order) && dayKey(order.created_at) >= start)
    .reduce((sum, order) => sum + order.total, 0);
}

/** Sales on each day, oldest first, a day with none at nothing. */
export function salesByDay(orders: readonly PeriodOrder[], days: readonly string[]): { day: string; total: number }[] {
  const totals = new Map(days.map((day) => [day, 0]));
  for (const order of orders.filter(counted)) {
    const day = dayKey(order.created_at);
    const sofar = totals.get(day);
    if (sofar !== undefined) totals.set(day, sofar + order.total);
  }
  return [...totals].map(([day, total]) => ({ day, total }));
}

/**
 * The period's best sellers by what they took, then by how many. Custom items
 * are one line together, since each is a one-off (plan §139.10, Analytics).
 */
export function topProducts(orders: readonly PeriodOrder[], start: string): TopProduct[] {
  const lines = new Map<string, TopProduct>();
  for (const order of orders.filter((entry) => counted(entry) && dayKey(entry.created_at) >= start)) {
    for (const item of order.order_items) {
      const key = item.product_id ?? "custom";
      const line = lines.get(key) ?? {
        productId: item.product_id,
        name: item.product_id === null ? UI_TEXT.home.customItems : item.product_name,
        iconKey: item.products?.icon_key ?? null,
        quantity: 0,
        sales: 0,
      };
      line.quantity += item.quantity;
      line.sales += item.subtotal;
      lines.set(key, line);
    }
  }
  return [...lines.values()]
    .sort((a, b) => b.sales - a.sales || b.quantity - a.quantity || a.name.localeCompare(b.name))
    .slice(0, HOME_LIST_LIMITS.topProducts);
}

/** How many of the period's orders stand at each status; a status with none is left out. */
export function ordersByStatus(
  orders: readonly PeriodOrder[],
  start: string,
): { status: OrderStatus; count: number }[] {
  const inPeriod = orders.filter((order) => dayKey(order.created_at) >= start);
  return ORDER_STATUSES.map((status) => ({
    status,
    count: inPeriod.filter((order) => order.status === status).length,
  })).filter((entry) => entry.count > 0);
}

/** Open orders due by tomorrow, soonest first, as Home groups them: overdue, today, tomorrow. */
export function groupDue(orders: readonly OrderListItem[], now: Date = new Date()): DueGroup[] {
  const buckets: DueGroup["bucket"][] = ["overdue", "today", "tomorrow"];
  return buckets
    .map((bucket) => ({ bucket, orders: orders.filter((order) => dueBucket(order.dueAt, now) === bucket) }))
    .filter((group) => group.orders.length > 0);
}

/**
 * Stocked products on sale at or under the low-stock mark, emptiest first
 * (plan §20), from `stock_levels` (0019). A product whose stock was never
 * counted is not low — nobody keeps its stock — the same rule the oversell
 * guard uses (0015).
 */
export function lowStock(
  levels: readonly { product_id: string; balance: number; stocked: boolean }[],
  products: readonly { id: string; name: string; icon_key: string | null; unit: string }[],
): LowStockLine[] {
  const stock = new Map(levels.map((level) => [level.product_id, level]));
  return products
    .flatMap((product) => {
      const level = stock.get(product.id);
      return level?.stocked
        ? [{ productId: product.id, name: product.name, iconKey: product.icon_key, unit: product.unit, balance: level.balance }]
        : [];
    })
    .filter((line) => line.balance <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.balance - b.balance || a.name.localeCompare(b.name));
}

/**
 * The customers who ordered last, newest first, each once, from orders read
 * newest first; with how many orders each has placed.
 */
export function recentCustomers(
  orders: readonly { created_at: string; customers: { id: string; name: string } | null }[],
  orderCounts: ReadonlyMap<string, number>,
): RecentCustomer[] {
  const seen = new Map<string, RecentCustomer>();
  for (const order of orders) {
    const customer = order.customers;
    if (!customer || seen.has(customer.id)) continue;
    seen.set(customer.id, {
      id: customer.id,
      name: customer.name,
      orders: orderCounts.get(customer.id) ?? 0,
      lastOrderAt: order.created_at,
    });
    if (seen.size === HOME_LIST_LIMITS.recentCustomers) break;
  }
  return [...seen.values()];
}

