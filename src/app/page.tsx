"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  CircleDollarSign,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/nav/AppShell";
import { ProductTile } from "@/components/ui/product-tile";
import { cn } from "@/components/ui/cn";
import { ScreenNotice } from "@/components/ui/screen-notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { LOW_STOCK_THRESHOLD } from "@/constants/inventory";
import { lowStock, ordersByDue, summarise } from "@/features/dashboard/summary";
import type { InventoryBalance } from "@/features/inventory/types";
import type { Order } from "@/features/orders/types";
import { statusBadge } from "@/features/orders/view";
import type { Product } from "@/features/products/types";
import { DUE_BUCKET_LABELS } from "@/lib/dates/calendar";
import { formatPaise } from "@/lib/format/currency";
import { formatQuantity } from "@/lib/format/quantity";
import { formatDateTime } from "@/lib/format/date";
import { errorMessage } from "@/lib/errors/errorMessage";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

const QUICK_ACTIONS = [
  { label: "Add Order", icon: ShoppingBag, tone: "text-primary", href: "/orders/new" },
  { label: "Add Customer", icon: Users, tone: "text-primary", href: "/customers" },
  { label: "Add Stock", icon: Package, tone: "text-warning", href: "/inventory" },
  { label: "Add Expense", icon: CircleDollarSign, tone: "text-danger", href: "/expenses" },
] as const;

/**
 * The operational view (plan §20): what needs attention now, then what is due,
 * then today's trading. Everything on it is read from the bakery's own data —
 * analytics belong on the Analytics page, not here.
 */
export default function DashboardPage() {
  const orders = useApiQuery<Order[]>(apiRoutes.orders.list);
  const products = useApiQuery<Product[]>(apiRoutes.products.list);
  const balances = useApiQuery<InventoryBalance[]>(apiRoutes.inventory.balances());

  const summary = useMemo(() => summarise(orders.data ?? []), [orders.data]);
  const due = useMemo(() => ordersByDue(orders.data ?? []), [orders.data]);
  const low = useMemo(
    () => lowStock(products.data ?? [], balances.data ?? []),
    [products.data, balances.data],
  );

  const loading = orders.isLoading && orders.data === undefined;
  const failed = orders.error != null && orders.data === undefined;

  return (
    <AppShell>
      <section>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-primary">Dashboard</p>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-text sm:text-3xl">
          Good morning, Baker!
        </h1>
        <p className="mt-1 text-sm font-medium text-text-muted">Here&rsquo;s your bakery today.</p>
      </section>

      {failed && <ScreenNotice>{errorMessage(orders.error, "DASHBOARD_LOAD_FAILED")}</ScreenNotice>}

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
        <h2 className="mb-4 flex items-center gap-2 font-heading text-sm font-bold text-text">
          <ClipboardList size={18} strokeWidth={2.5} className="text-primary" aria-hidden="true" />
          Business Today
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Today's Orders" value={loading ? "—" : String(summary.todaysOrders)} />
          <StatTile
            label="Today's Revenue"
            value={loading ? "—" : formatPaise(summary.todaysRevenue)}
            tone="success"
            icon={TrendingUp}
          />
          <StatTile
            label="Pending Orders"
            value={loading ? "—" : String(summary.pendingOrders)}
            tone="warning"
          />
          <StatTile
            label="Pending Payments"
            value={loading ? "—" : formatPaise(summary.pendingPayments)}
            tone="danger"
          />
        </dl>
      </section>

      <section aria-labelledby="pending-orders">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="pending-orders" className="flex items-center gap-2 font-heading text-sm font-bold text-text">
            <ShoppingBag size={18} strokeWidth={2.5} className="text-primary" aria-hidden="true" />
            Pending Orders
          </h2>
          <span className="rounded-md bg-surface-hover px-2 py-1 text-xs font-medium text-text-muted">
            Sorted by due date
          </span>
        </div>

        {loading ? (
          <SkeletonRows rows={2} height="h-20" />
        ) : due.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm font-medium text-text-muted">
            Nothing is waiting on you. Every order is delivered or cancelled.
          </p>
        ) : (
          <div className="space-y-5">
            {due.map((group) => (
              <div key={group.bucket}>
                <h3
                  className={cn(
                    "mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider",
                    group.bucket === "overdue"
                      ? "text-danger"
                      : group.bucket === "today"
                        ? "text-warning"
                        : "text-text-muted",
                  )}
                >
                  {group.bucket === "overdue" && (
                    <AlertTriangle size={14} strokeWidth={2.5} aria-hidden="true" />
                  )}
                  {DUE_BUCKET_LABELS[group.bucket]}
                </h3>
                <ul role="list" className="space-y-2.5">
                  {group.orders.map((order) => {
                    const badge = statusBadge(order);
                    return (
                      <li key={order.id}>
                        <Link href={`/orders/${order.id}`} className="group block">
                          <article
                            className={cn(
                              "flex items-center justify-between rounded-2xl border border-l-4 p-4 shadow-card transition-all hover:shadow-md active:scale-[0.99]",
                              group.bucket === "overdue"
                                ? "border-danger/20 border-l-danger bg-danger-bg"
                                : "border-border border-l-warning bg-surface hover:bg-surface-hover",
                            )}
                          >
                            <div className="min-w-0 pr-3">
                              <span className="block truncate text-sm font-bold text-text transition-colors group-hover:text-primary">
                                {order.orderNumber}
                              </span>
                              <span className="mt-0.5 block text-xs font-medium text-text-muted">
                                {order.items.length} item{order.items.length === 1 ? "" : "s"} •{" "}
                                {formatDateTime(order.delivery.date)}
                              </span>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="mb-1 block text-sm font-bold text-text">
                                {formatPaise(order.pricing.total)}
                              </span>
                              <StatusBadge label={badge.label} tone={badge.tone} />
                            </div>
                          </article>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="mb-4 font-heading text-sm font-bold text-text">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ACTIONS.map(({ label, icon: Icon, tone, href }) => (
            <Link
              key={label}
              href={href}
              className="touch-target group flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all hover:border-primary/30 hover:bg-surface-hover hover:shadow-md active:scale-95"
            >
              <Icon
                size={24}
                strokeWidth={2}
                aria-hidden="true"
                className={cn(tone, "transition-transform group-hover:scale-110")}
              />
              <span className="text-xs font-bold">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="low-stock">
        <h2 id="low-stock" className="mb-4 flex items-center gap-2 font-heading text-sm font-bold text-text">
          <Package size={18} strokeWidth={2.5} className="text-warning" aria-hidden="true" />
          Low Stock Alerts
        </h2>

        {low.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm font-medium text-text-muted">
            Nothing is running low.
          </p>
        ) : (
          <ul role="list" className="space-y-3">
            {low.map(({ product, balance }) => (
              <li
                key={product.id}
                className="rounded-2xl border border-border border-l-4 border-l-danger bg-surface p-4 shadow-card"
              >
                <div className="flex items-center justify-between gap-4">
                  <ProductTile iconKey={product.iconKey} />
                  <div className="min-w-0 flex-1">
                    <span className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-danger">
                      <AlertTriangle size={12} strokeWidth={3} aria-hidden="true" /> Reorder soon
                    </span>
                    <h3 className="truncate text-sm font-bold">{product.name}</h3>
                    <p className="mt-0.5 text-xs font-medium text-text-muted">
                      {formatQuantity(balance, product.unit)} left • alerts below {LOW_STOCK_THRESHOLD}
                    </p>
                  </div>
                  <Link
                    href="/inventory"
                    className="touch-target inline-flex shrink-0 items-center rounded-xl border border-danger/20 bg-danger/10 px-4 py-2 text-xs font-bold text-danger transition-all hover:bg-danger/20 active:scale-95"
                  >
                    + Stock
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-text">
            <TrendingUp size={18} strokeWidth={2.5} className="text-primary" aria-hidden="true" />
            Business snapshot
          </h2>
          <Link
            href="/analytics"
            className="touch-target flex items-center gap-1 text-xs font-bold text-primary transition-all hover:underline"
          >
            Analytics <ArrowRight size={14} strokeWidth={2.5} aria-hidden="true" />
          </Link>
        </div>
        <p className="mt-3 text-sm font-medium text-text-muted">
          Revenue, expenses and top sellers live on the Analytics page.
        </p>
      </section>
    </AppShell>
  );
}
