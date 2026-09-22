"use client";

import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Award, BarChart3, CircleDollarSign } from "lucide-react";

import { AppShell } from "@/components/nav/AppShell";
import { PageHeader } from "@/components/ui/page-header";
import { ScreenNotice } from "@/components/ui/screen-notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import type { Expense } from "@/features/expenses/types";
import type { Order } from "@/features/orders/types";
import { errorMessage } from "@/lib/errors/errorMessage";
import { formatPaise } from "@/lib/format/currency";
import { sumPaise } from "@/lib/money";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

interface ProductSales {
  productId: string;
  name: string;
  quantity: number;
  /** Whole paise. */
  revenue: number;
}

interface Analytics {
  revenue: number;
  cost: number;
  profit: number;
  topProducts: ProductSales[];
}

const TOP_PRODUCT_COUNT = 5;

/** What the bakery took, what it spent and what sold — all in paise (AGENTS.md §13). */
function analyse(orders: readonly Order[], expenses: readonly Expense[]): Analytics {
  const sold = orders.filter((order) => order.status !== "CANCELLED");
  const revenue = sumPaise(sold.map((order) => order.pricing.total));
  const cost = sumPaise(expenses.map((expense) => expense.amount));

  const sales = new Map<string, ProductSales>();
  for (const order of sold) {
    for (const item of order.items) {
      const key = item.productId ?? item.productName;
      const entry = sales.get(key) ?? { productId: key, name: item.productName, quantity: 0, revenue: 0 };
      entry.quantity += item.quantity;
      entry.revenue += item.subtotal;
      sales.set(key, entry);
    }
  }

  return {
    revenue,
    cost,
    profit: revenue - cost,
    topProducts: [...sales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, TOP_PRODUCT_COUNT),
  };
}

/** One headline figure with the direction it points in. */
function Figure({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof ArrowUpRight;
  tone: "neutral" | "success" | "danger";
}) {
  const accent =
    tone === "success" ? "bg-success/10 text-success" : tone === "danger" ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary";
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-start justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">{label}</span>
        <span className={`rounded-lg p-1.5 ${accent}`}>
          <Icon size={16} strokeWidth={3} aria-hidden="true" />
        </span>
      </div>
      <span className="font-heading text-3xl font-bold text-text">{value}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const orders = useApiQuery<Order[]>(apiRoutes.orders.list);
  const expenses = useApiQuery<Expense[]>(apiRoutes.expenses.list);

  const metrics = useMemo(
    () => analyse(orders.data ?? [], expenses.data ?? []),
    [orders.data, expenses.data],
  );

  const loading = orders.data === undefined || expenses.data === undefined;
  const failure = orders.error ?? expenses.error;

  return (
    <AppShell>
      <PageHeader
        icon={BarChart3}
        title="Analytics"
        subtitle="Financial overview and performance"
      />

      {failure != null && loading ? (
        <ScreenNotice>{errorMessage(failure, "ANALYTICS_LOAD_FAILED")}</ScreenNotice>
      ) : loading ? (
        <SkeletonRows rows={2} height="h-32" />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Figure
              label="Total Revenue"
              value={formatPaise(metrics.revenue)}
              icon={ArrowUpRight}
              tone="success"
            />
            <Figure
              label="Total Expenses"
              value={formatPaise(metrics.cost)}
              icon={ArrowDownRight}
              tone="danger"
            />
            <Figure
              label="Net Profit"
              value={formatPaise(metrics.profit)}
              icon={CircleDollarSign}
              tone={metrics.profit >= 0 ? "success" : "danger"}
            />
          </section>

          <section className="rounded-3xl border border-border bg-surface p-6 shadow-card">
            <h2 className="mb-6 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wider text-text">
              <Award size={20} strokeWidth={2.5} className="text-warning" aria-hidden="true" />
              Top Selling Products
            </h2>

            {metrics.topProducts.length === 0 ? (
              <p className="py-8 text-center text-sm font-medium text-text-muted">
                No sales yet.
              </p>
            ) : (
              <ul role="list" className="space-y-4">
                {metrics.topProducts.map((product, index) => {
                  const best = metrics.topProducts[0].revenue || 1;
                  const share = Math.max((product.revenue / best) * 100, 5);
                  return (
                    <li key={product.productId} className="flex items-center gap-4">
                      <span
                        aria-hidden="true"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-bold"
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-end justify-between gap-3">
                          <span className="truncate text-sm font-bold text-text">{product.name}</span>
                          <span className="shrink-0 font-heading text-sm font-bold text-primary">
                            {formatPaise(product.revenue)}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full border border-border bg-background">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                        </div>
                        <span className="mt-1 block text-[10px] font-bold tracking-wider text-text-muted">
                          {product.quantity} sold
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
