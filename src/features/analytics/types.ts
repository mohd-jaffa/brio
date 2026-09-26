import type { OrderStatus } from "@/constants/statuses";
import type { Interval, Period } from "@/lib/dates/range";

/** A figure this period, and the same figure the period before (IMP-10). */
export interface Figure {
  value: number;
  previous: number;
}

/** A product's part in the period's sales; custom items together are one line, with no product. */
export interface ProductSales {
  productId: string | null;
  name: string;
  iconKey: string | null;
  /** How many orders had it. */
  orders: number;
  quantity: number;
  /** Whole paise. */
  sales: number;
}

export interface TopCustomer {
  id: string;
  name: string;
  orders: number;
  /** Whole paise. */
  spent: number;
}

/**
 * Analytics for a period (plan §139.10, §139.11.11), worked out on the server
 * in the business's calendar (§133.9 I3). Cancelled orders count for nothing
 * but their place in "by status". Money is whole paise.
 */
export interface AnalyticsReport {
  period: Period;
  previous: Period;
  interval: Interval;
  kpis: {
    sales: Figure;
    orders: Figure;
    newCustomers: Figure;
    /** Whole paise, rounded. */
    averageOrder: Figure;
  };
  /** Sales in each group of the period, with the group at the same place in the period before. */
  salesTrend: { start: string; value: number; previous: number }[];
  ordersTrend: { start: string; value: number }[];
  /** Every product sold, by what it took. */
  products: ProductSales[];
  ordersByStatus: { status: OrderStatus; count: number }[];
  handover: { pickup: number; delivery: number };
  /** What Guests bought, and what saved customers bought (plan §139.11.3). */
  guestSplit: { guest: number; customers: number };
  /** Of the period's sales, what has been paid and what is still owed. */
  collection: { collected: number; toCollect: number };
  /** The customers who ordered: added in the period, or before it. */
  customerMix: { new: number; returning: number };
  /** Who spent most, Guests left out (§133.9 I1). */
  topCustomers: TopCustomer[];
}
