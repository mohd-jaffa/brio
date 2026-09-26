"use client";

import Link from "next/link";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { BarTrend } from "@/components/ui/charts/bar-trend";
import { Donut } from "@/components/ui/charts/donut";
import { IntervalSelect } from "@/components/ui/charts/interval-select";
import { LineTrend } from "@/components/ui/charts/line-trend";
import { ProductTile } from "@/components/ui/product-tile";
import { Row, RowList } from "@/components/ui/row";
import { SectionHeading } from "@/components/ui/section-heading";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { UI_TEXT } from "@/constants/messages";
import { ORDER_STATUS_LABELS } from "@/constants/statuses";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Interval } from "@/lib/dates/range";
import { formatPaise } from "@/lib/format/currency";
import { formatDayMonth } from "@/lib/format/date";

import { percentChange } from "../summary";
import type { AnalyticsReport, ProductSales } from "../types";

const text = UI_TEXT.analytics;

/** A list's empty line, in the card a list would have filled. */
function Nothing({ children }: { children: string }) {
  return (
    <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-text-muted shadow-card">
      {children}
    </p>
  );
}

function salesSummary(report: AnalyticsReport): string {
  const change = percentChange(report.kpis.sales);
  const moved = change === undefined ? null : change > 0 ? text.rose(change) : change < 0 ? text.fell(-change) : text.level;
  return text.salesSummary(formatPaise(report.kpis.sales.value), moved);
}

/** The sales trend, with the period before dashed beneath it where `compare` says. */
function SalesTrend({
  report,
  compare,
  onInterval,
}: {
  report: AnalyticsReport;
  compare: boolean;
  onInterval: (next: Interval) => void;
}) {
  return (
    <LineTrend
      title={text.salesTrend}
      summary={salesSummary(report)}
      points={report.salesTrend.map((group) => ({ label: formatDayMonth(group.start), value: group.value }))}
      previous={
        compare
          ? report.salesTrend.map((group) => ({ label: formatDayMonth(group.start), value: group.previous }))
          : undefined
      }
      action={<IntervalSelect value={report.interval} onChange={onInterval} />}
      emptyMessage={text.noSales}
    />
  );
}

function ProductRows({ products, detail }: { products: readonly ProductSales[]; detail: "orders" | "full" }) {
  return (
    <RowList label={text.topProducts}>
      {products.map((product) => (
        <Row
          key={product.productId ?? "custom"}
          leading={<ProductTile iconKey={product.iconKey} />}
          title={product.name}
          subtitle={detail === "orders" ? text.orderCount(product.orders) : text.productLine(product.orders, product.quantity)}
          trailing={<span className="tabular-nums">{formatPaise(product.sales)}</span>}
        />
      ))}
    </RowList>
  );
}

/**
 * What each product brought in, as shares of a ring: the five best and Others,
 * custom items as one slice. Its total is what the items came to, before
 * charges and discounts, so the centre says so rather than "Total sales".
 */
function SalesByProduct({ products }: { products: readonly ProductSales[] }) {
  const total = products.reduce((sum, product) => sum + product.sales, 0);
  const best = products[0];
  return (
    <Donut
      title={text.salesByProduct}
      summary={
        best ? text.salesByProductSummary(best.name, formatPaise(best.sales), formatPaise(total)) : text.noSales
      }
      slices={products.map((product) => ({ label: product.name, value: product.sales }))}
      totalLabel={text.itemSales}
      labelHeading={UI_TEXT.charts.product}
      emptyMessage={text.noSales}
    />
  );
}

/**
 * Overview: the sales trend — the period before dashed beneath it on a
 * desktop — the best sellers, and sales by product. The best sellers are
 * catalogue products only (§139.11.7); custom items count in the ring.
 */
export function OverviewPanel({
  report,
  onInterval,
  onAllProducts,
}: {
  report: AnalyticsReport;
  onInterval: (next: Interval) => void;
  onAllProducts: () => void;
}) {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const best = report.products.filter((product) => product.productId !== null).slice(0, 5);
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <SalesTrend report={report} compare={desktop} onInterval={onInterval} />
      </div>
      <section aria-labelledby="analytics-top" className="lg:col-span-2 lg:row-span-2">
        <SectionHeading id="analytics-top" title={text.topProducts}>
          <button
            type="button"
            onClick={onAllProducts}
            className="touch-target rounded-lg px-2 text-sm font-medium text-primary transition-colors hover:bg-surface-hover"
          >
            {text.viewAllProducts}
          </button>
        </SectionHeading>
        {best.length === 0 ? <Nothing>{text.noProducts}</Nothing> : <ProductRows products={best} detail="orders" />}
      </section>
      <div className="lg:col-span-3">
        <SalesByProduct products={report.products} />
      </div>
    </div>
  );
}

/** Sales: the trend against the period before, Guests against saved customers, and collected against owed. */
export function SalesPanel({ report, onInterval }: { report: AnalyticsReport; onInterval: (next: Interval) => void }) {
  const { guestSplit, collection } = report;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <SalesTrend report={report} compare onInterval={onInterval} />
      </div>
      <Donut
        title={text.salesBySource}
        summary={text.salesBySourceSummary(formatPaise(guestSplit.guest), formatPaise(guestSplit.customers))}
        slices={[
          { label: text.savedCustomers, value: guestSplit.customers },
          { label: text.guests, value: guestSplit.guest },
        ]}
        totalLabel={text.totalSalesShort}
        action={
          <Link
            href="/customers/guest"
            className="touch-target inline-flex items-center rounded-lg px-2 text-sm font-medium text-primary transition-colors hover:bg-surface-hover"
          >
            {text.viewGuestSales}
          </Link>
        }
        emptyMessage={text.noSales}
      />
      <Donut
        title={text.collection}
        summary={text.collectionSummary(formatPaise(collection.collected), formatPaise(collection.toCollect))}
        slices={[
          { label: text.collected, value: collection.collected },
          { label: text.toCollect, value: collection.toCollect },
        ]}
        totalLabel={text.totalSalesShort}
        emptyMessage={text.noSales}
      />
    </div>
  );
}

/** Orders: how many each day or week, by status, and pickup against delivery. */
export function OrdersPanel({ report }: { report: AnalyticsReport }) {
  const total = report.ordersTrend.reduce((sum, group) => sum + group.value, 0);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <BarTrend
          title={text.ordersPerDay(report.interval)}
          summary={text.ordersSummary(total)}
          points={report.ordersTrend.map((group) => ({ label: formatDayMonth(group.start), value: group.value }))}
          unit="count"
          emptyMessage={text.noOrders}
        />
      </div>
      <Donut
        title={text.byStatus}
        summary={text.ordersSummary(report.ordersByStatus.reduce((sum, entry) => sum + entry.count, 0))}
        slices={report.ordersByStatus.map((entry) => ({ label: ORDER_STATUS_LABELS[entry.status], value: entry.count }))}
        totalLabel={text.totalOrders}
        unit="count"
        labelHeading={UI_TEXT.charts.status}
        emptyMessage={text.noOrders}
      />
      <Donut
        title={text.handover}
        summary={text.handoverSummary(report.handover.pickup, report.handover.delivery)}
        slices={[
          { label: text.pickup, value: report.handover.pickup },
          { label: text.delivery, value: report.handover.delivery },
        ]}
        totalLabel={text.totalOrders}
        unit="count"
        emptyMessage={text.noOrders}
      />
    </div>
  );
}

/** Customers: new against returning, and who spent most — Guests left out (§133.9 I1). */
export function CustomersPanel({ report }: { report: AnalyticsReport }) {
  const mix = report.customerMix;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Donut
        title={text.customerMix}
        summary={text.customerMixSummary(mix.new, mix.returning)}
        slices={[
          { label: text.newLabel, value: mix.new },
          { label: text.returningLabel, value: mix.returning },
        ]}
        totalLabel={text.customersTotal}
        unit="count"
        emptyMessage={text.noCustomers}
      />
      <section aria-labelledby="analytics-customers">
        <SectionHeading id="analytics-customers" title={text.topCustomers} />
        {report.topCustomers.length === 0 ? (
          <Nothing>{text.noCustomers}</Nothing>
        ) : (
          <>
            <RowList label={text.topCustomers}>
              {report.topCustomers.map((customer) => (
                <Row
                  key={customer.id}
                  href={`/customers/${customer.id}`}
                  leading={<Avatar name={customer.name} />}
                  title={customer.name}
                  subtitle={text.orderCount(customer.orders)}
                  trailing={<span className="tabular-nums">{formatPaise(customer.spent)}</span>}
                />
              ))}
            </RowList>
            <p className="mt-2 text-xs text-text-muted">{text.topCustomersNote}</p>
          </>
        )}
      </section>
    </div>
  );
}

type Ranking = "SALES" | "QUANTITY";

/** Products: every product sold, ranked by what it took or by how many; custom items as one row. */
export function ProductsPanel({ report }: { report: AnalyticsReport }) {
  const [ranking, setRanking] = useState<Ranking>("SALES");
  const ranked =
    ranking === "SALES"
      ? report.products
      : [...report.products].sort((a, b) => b.quantity - a.quantity || b.sales - a.sales || a.name.localeCompare(b.name));
  return (
    <section aria-label={text.tabNames.PRODUCTS} className="space-y-4">
      <div className="max-w-xs">
        <SegmentedControl
          label={text.ranking}
          value={ranking}
          onChange={setRanking}
          options={(["SALES", "QUANTITY"] as const).map((value) => ({ value, label: text.rankings[value] }))}
        />
      </div>
      {ranked.length === 0 ? <Nothing>{text.noProducts}</Nothing> : <ProductRows products={ranked} detail="full" />}
    </section>
  );
}
