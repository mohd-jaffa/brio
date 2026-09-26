"use client";

import { CalendarClock, PackageOpen, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { BarTrend } from "@/components/ui/charts/bar-trend";
import { Donut } from "@/components/ui/charts/donut";
import { Fab } from "@/components/ui/fab";
import { Hero } from "@/components/ui/hero";
import { LoadFailed } from "@/components/ui/list-screen";
import { ProductTile } from "@/components/ui/product-tile";
import { QuoteBlock } from "@/components/ui/quote-block";
import { Row, RowList } from "@/components/ui/row";
import { FilterButton } from "@/components/ui/search-field";
import { SectionHeading } from "@/components/ui/section-heading";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SkeletonRows } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import { UI_TEXT } from "@/constants/messages";
import { HOME_PERIOD_LABELS, HOME_PERIODS, type HomePeriod } from "@/constants/ranges";
import { ORDER_STATUS_LABELS } from "@/constants/statuses";
import { useAuth } from "@/features/auth/AuthProvider";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { OrderRow } from "@/features/orders/components/OrderRow";
import { bakeryHour, DUE_BUCKET_LABELS, todayKey } from "@/lib/dates/calendar";
import { formatPaise } from "@/lib/format/currency";
import { formatDayMonth, formatLongDate } from "@/lib/format/date";
import { formatQuantity } from "@/lib/format/quantity";
import { apiRoutes, withQuery } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

import { greeting } from "../greeting";
import type { Dashboard } from "../types";
import { DueFilterSheet, type DueFilters } from "./DueFilterSheet";

const PERIODS = HOME_PERIODS.map((period) => ({ value: period, label: HOME_PERIOD_LABELS[period] }));

/** Home's orders due, grouped as the plan orders them: overdue, today, tomorrow (§20). */
function OrdersDue({ dashboard, filtered, now }: { dashboard: Dashboard; filtered: boolean; now: Date }) {
  const text = UI_TEXT.home;
  if (dashboard.due.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-text-muted shadow-card">
        {filtered ? text.noneDueFiltered : text.noneDue}
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {dashboard.due.map((group) => (
        <div key={group.bucket}>
          <h3
            className={
              group.bucket === "overdue"
                ? "mb-2 text-xs font-semibold uppercase tracking-wider text-danger"
                : "mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted"
            }
          >
            {DUE_BUCKET_LABELS[group.bucket]}
          </h3>
          <RowList label={DUE_BUCKET_LABELS[group.bucket]}>
            {group.orders.map((order) => (
              <OrderRow key={order.id} order={order} now={now} />
            ))}
          </RowList>
        </div>
      ))}
    </div>
  );
}

/**
 * Home (plan §139.10, §20). What needs attention comes first: the orders due,
 * overdue at the top, and what is running low; then how the period is going.
 *
 * - **Phone:** the greeting on the hero plate; four tiles with a Today / Week /
 *   Month switch — due today, sales, to collect, low stock; the orders due,
 *   with their filters (§116); low stock; the quote; and the + for a new order.
 * - **Desktop:** a greeting row with the date and the quote; the tiles, sales
 *   with its sparkline; then the sales by day, the orders by status, the top
 *   products and the recent customers beside the lists.
 *
 * Everything is worked out on the server (`GET /api/dashboard`), so Home never
 * reads every order.
 */
export function Home() {
  const text = UI_TEXT.home;
  const { profile } = useAuth();
  const business = useBusiness();
  // The clock is read once, when Home opens: the greeting and the groups agree.
  const [now] = useState(() => new Date());
  const [period, setPeriod] = useState<HomePeriod>("TODAY");
  const [filters, setFilters] = useState<DueFilters>({});
  const [filtering, setFiltering] = useState(false);

  const dashboard = useApiQuery<Dashboard>(
    withQuery(apiRoutes.dashboard, {
      period: period === "TODAY" ? undefined : period,
      status: filters.status,
      payment: filters.payment,
    }),
    { keepPreviousData: true },
  );
  const data = dashboard.data;
  const filtered = filters.status !== undefined || filters.payment !== undefined;

  const hello = greeting(bakeryHour(now), profile?.name);
  const line = business.data?.tagline ?? text.neutralLine;

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* The compact band below 1024 px, so the orders due start on the first screen of a phone. */}
      <div className="lg:hidden">
        <Hero as="h1" variant="band" lines={[hello]} subtitle={line} plate="drip-cake" priority />
      </div>
      <header className="hidden items-end justify-between gap-8 lg:flex">
        <div className="min-w-0">
          <h1 className="font-heading text-4xl font-medium tracking-tight text-text">{hello}</h1>
          <p className="mt-2 text-base text-text-muted">{line}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm text-text-muted">{formatLongDate(todayKey(now))}</p>
          <p className="mt-1 font-heading text-lg italic text-text">&ldquo;{text.quote}&rdquo;</p>
        </div>
      </header>

      <section aria-label={text.period} className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="w-full max-w-xs">
            <SegmentedControl label={text.period} value={period} options={PERIODS} onChange={setPeriod} />
          </div>
          <Fab label={text.newOrder} href="/orders/new" />
        </div>
        {data ? (
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
            <StatTile label={text.dueToday} value={String(data.dueToday)} icon={CalendarClock} />
            <StatTile
              label={text.sales[data.period]}
              value={formatPaise(data.sales)}
              icon={TrendingUp}
              tone="success"
              headline
              trend={data.salesByDay.map((day) => day.total)}
            />
            <StatTile label={text.toCollect} value={formatPaise(data.toCollect)} icon={Wallet} tone="warning" headline />
            <StatTile label={text.lowStock} value={String(data.lowStockCount)} icon={PackageOpen} tone="danger" />
          </dl>
        ) : dashboard.error ? (
          <LoadFailed query={dashboard} loadFailed="DASHBOARD_LOAD_FAILED" />
        ) : (
          <div role="status" aria-busy="true" aria-label={text.loading}>
            <SkeletonRows rows={2} height="h-28" />
          </div>
        )}
      </section>

      {data && (
        // Two columns that stack on their own from 1024 px: what is due, and
        // the period's sales, lead; the side keeps stock, status, the best
        // sellers and the latest customers. Below it, one column, due first.
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start lg:gap-8">
          <div className="lg:col-span-2 lg:space-y-8">
            <section aria-labelledby="home-due">
              <SectionHeading
                id="home-due"
                title={text.ordersDue}
                viewAll={{ href: "/orders", label: text.viewAll, name: text.viewAllOf(text.ordersDue) }}
              >
                <FilterButton label={text.filter} onClick={() => setFiltering(true)} active={filtered} size="sm" />
              </SectionHeading>
              <OrdersDue dashboard={data} filtered={filtered} now={now} />
            </section>
            <div className="hidden lg:block">
              <BarTrend
                title={text.salesOverview}
                summary={text.salesSummary(
                  formatDayMonth(data.salesByDay[0]?.day),
                  formatDayMonth(data.salesByDay.at(-1)?.day),
                  formatPaise(data.sales),
                )}
                points={data.salesByDay.map((day) => ({ label: formatDayMonth(day.day), value: day.total }))}
                emptyMessage={text.noSales}
              />
            </div>
          </div>
          {/* Below 1024 px each column shows one section, so only the desktop spaces them. */}
          <div className="lg:space-y-8">
            <section aria-labelledby="home-low">
              <SectionHeading
                id="home-low"
                title={text.lowStock}
                viewAll={{ href: "/inventory", label: text.viewAll, name: text.viewAllOf(text.lowStock) }}
              />
              {data.lowStock.length === 0 ? (
                <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-text-muted shadow-card">
                  {text.noLowStock}
                </p>
              ) : (
                <RowList label={text.lowStock}>
                  {data.lowStock.map((line) => (
                    <Row
                      key={line.productId}
                      href="/inventory"
                      leading={<ProductTile iconKey={line.iconKey} />}
                      title={line.name}
                      subtitle={text.left(formatQuantity(line.balance, line.unit))}
                    />
                  ))}
                </RowList>
              )}
            </section>
            <div className="hidden lg:block">
              <Donut
                title={text.orderStatus}
                summary={text.orderStatusSummary(data.ordersByStatus.reduce((sum, entry) => sum + entry.count, 0))}
                slices={data.ordersByStatus.map((entry) => ({ label: ORDER_STATUS_LABELS[entry.status], value: entry.count }))}
                totalLabel={text.totalOrders}
                unit="count"
                labelHeading={UI_TEXT.charts.status}
                emptyMessage={text.noOrders}
              />
            </div>
            <section aria-labelledby="home-top" className="hidden lg:block">
              <SectionHeading id="home-top" title={text.topProducts} />
              {data.topProducts.length === 0 ? (
                <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-text-muted shadow-card">
                  {text.noTopProducts}
                </p>
              ) : (
                <RowList label={text.topProducts}>
                  {data.topProducts.map((product) => (
                    <Row
                      key={product.productId ?? "custom"}
                      leading={<ProductTile iconKey={product.iconKey} />}
                      title={product.name}
                      subtitle={text.sold(product.quantity)}
                      trailing={<span className="tabular-nums">{formatPaise(product.sales)}</span>}
                    />
                  ))}
                </RowList>
              )}
            </section>
            <section aria-labelledby="home-customers" className="hidden lg:block">
              <SectionHeading
                id="home-customers"
                title={text.recentCustomers}
                viewAll={{ href: "/customers", label: text.viewAll, name: text.viewAllOf(text.recentCustomers) }}
              />
              {data.recentCustomers.length === 0 ? (
                <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-text-muted shadow-card">
                  {text.noRecentCustomers}
                </p>
              ) : (
                <RowList label={text.recentCustomers}>
                  {data.recentCustomers.map((customer) => (
                    <Row
                      key={customer.id}
                      href={`/customers/${customer.id}`}
                      leading={<Avatar name={customer.name} />}
                      title={customer.name}
                      subtitle={text.orderCount(customer.orders)}
                    />
                  ))}
                </RowList>
              )}
            </section>
          </div>
        </div>
      )}

      {/* It closes the page, so it waits for the page: shown while the orders
          load, it sat in view and was pushed down when they came. */}
      {data && (
        <div className="lg:hidden">
          <QuoteBlock quote={text.quote} plate="brownies" />
        </div>
      )}

      <DueFilterSheet open={filtering} value={filters} onClose={() => setFiltering(false)} onApply={setFilters} />
    </div>
  );
}
