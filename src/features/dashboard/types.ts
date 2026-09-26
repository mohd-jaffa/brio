import type { HomePeriod } from "@/constants/ranges";
import type { OrderStatus } from "@/constants/statuses";
import type { DueBucket } from "@/lib/dates/calendar";
import type { OrderListItem } from "@/features/orders/types";

/** A group of Home's orders due: overdue, due today, due tomorrow. */
export interface DueGroup {
  bucket: Exclude<DueBucket, "later">;
  orders: OrderListItem[];
}

export interface LowStockLine {
  productId: string;
  name: string;
  iconKey: string | null;
  unit: string;
  balance: number;
}

/** A product's part in the period's sales; custom items together are one line, with no product. */
export interface TopProduct {
  productId: string | null;
  name: string;
  iconKey: string | null;
  quantity: number;
  /** Whole paise. */
  sales: number;
}

export interface RecentCustomer {
  id: string;
  name: string;
  /** Orders placed, cancelled ones left out. */
  orders: number;
  lastOrderAt: string;
}

/**
 * Home, worked out on the server (plan §139.10, §20): what needs attention now,
 * then how the period is going. Every amount is whole paise.
 */
export interface Dashboard {
  period: HomePeriod;
  /** Open orders due today. */
  dueToday: number;
  /** What the orders placed in the period come to, cancelled ones left out. */
  sales: number;
  /** What every order still owes, whenever it was placed. */
  toCollect: number;
  lowStockCount: number;
  /** Sales per day over the period — and at least the last week — oldest first. */
  salesByDay: { day: string; total: number }[];
  due: DueGroup[];
  /** More open orders are due by tomorrow than `due` shows. */
  moreDue: boolean;
  lowStock: LowStockLine[];
  topProducts: TopProduct[];
  /** The period's orders by status, in the order an order passes through them. */
  ordersByStatus: { status: OrderStatus; count: number }[];
  recentCustomers: RecentCustomer[];
}
