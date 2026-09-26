import type { AnalyticsReport } from "@/features/analytics/types";

/** Analytics for September so far against August's same days, for a component test. */
export function aReport(changes: Partial<AnalyticsReport> = {}): AnalyticsReport {
  return {
    period: { from: "2026-09-01", to: "2026-09-02" },
    previous: { from: "2026-08-01", to: "2026-08-02" },
    interval: "DAY",
    kpis: {
      sales: { value: 450000, previous: 400000 },
      orders: { value: 12, previous: 12 },
      newCustomers: { value: 3, previous: 0 },
      averageOrder: { value: 37500, previous: 40000 },
    },
    salesTrend: [
      { start: "2026-09-01", value: 200000, previous: 150000 },
      { start: "2026-09-02", value: 250000, previous: 250000 },
    ],
    ordersTrend: [
      { start: "2026-09-01", value: 5 },
      { start: "2026-09-02", value: 7 },
    ],
    products: [
      { productId: "p-1", name: "Truffle cake", iconKey: null, orders: 4, quantity: 4, sales: 300000 },
      { productId: "p-2", name: "Cupcakes", iconKey: null, orders: 3, quantity: 18, sales: 120000 },
      { productId: null, name: "Custom items", iconKey: null, orders: 2, quantity: 2, sales: 30000 },
    ],
    ordersByStatus: [
      { status: "PENDING", count: 4 },
      { status: "DELIVERED", count: 8 },
    ],
    handover: { pickup: 5, delivery: 7 },
    guestSplit: { guest: 50000, customers: 400000 },
    collection: { collected: 300000, toCollect: 150000 },
    customerMix: { new: 3, returning: 6 },
    topCustomers: [{ id: "c-1", name: "Anu Sharma", orders: 4, spent: 200000 }],
    ...changes,
  };
}
