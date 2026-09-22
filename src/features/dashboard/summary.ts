import { LOW_STOCK_THRESHOLD } from "@/constants/inventory";
import type { InventoryBalance } from "@/features/inventory/types";
import type { Order } from "@/features/orders/types";
import { byDueDate, isOpen } from "@/features/orders/view";
import type { Product } from "@/features/products/types";
import { dayKey, dueBucket, todayKey, type DueBucket } from "@/lib/dates/calendar";
import { sumPaise } from "@/lib/money";

/**
 * What the dashboard is for: what needs attention now, then today's trading
 * (plan §20). Worked out here rather than in the screen, so the same numbers
 * can be tested without rendering anything — and so the dashboard stays an
 * operational view rather than growing into the analytics page.
 */
export interface DashboardSummary {
  todaysOrders: number;
  /** Whole paise. */
  todaysRevenue: number;
  pendingOrders: number;
  pendingPayments: number;
}

export function summarise(orders: readonly Order[], now: Date = new Date()): DashboardSummary {
  const today = todayKey(now);
  const open = orders.filter(isOpen);
  const placedToday = orders.filter(
    (order) => order.status !== "CANCELLED" && dayKey(order.createdAt) === today,
  );
  const owing = orders.filter(
    (order) => order.status !== "CANCELLED" && order.payment.status !== "PAID",
  );

  return {
    todaysOrders: placedToday.length,
    todaysRevenue: sumPaise(placedToday.map((order) => order.pricing.total)),
    pendingOrders: open.length,
    pendingPayments: sumPaise(owing.map((order) => order.pricing.total)),
  };
}

export interface DueGroup {
  bucket: DueBucket;
  orders: Order[];
}

/** Open orders, soonest first, grouped by when they are due — overdue at the top. */
export function ordersByDue(orders: readonly Order[], now: Date = new Date()): DueGroup[] {
  const buckets: DueBucket[] = ["overdue", "today", "tomorrow", "later"];
  const open = byDueDate(orders.filter(isOpen), true);

  return buckets
    .map((bucket) => ({
      bucket,
      orders: open.filter((entry) => dueBucket(entry.delivery.date, now) === bucket),
    }))
    .filter((group) => group.orders.length > 0);
}

export interface LowStockLine {
  product: Product;
  balance: number;
}

/** Active products at or below the low-stock mark, emptiest first (plan §20). */
export function lowStock(
  products: readonly Product[],
  balances: readonly InventoryBalance[],
): LowStockLine[] {
  const byProduct = new Map(balances.map((balance) => [balance.productId, balance.balance]));

  return products
    .filter((product) => product.isActive)
    .map((product) => ({ product, balance: byProduct.get(product.id) ?? 0 }))
    .filter((line) => line.balance <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.balance - b.balance);
}
