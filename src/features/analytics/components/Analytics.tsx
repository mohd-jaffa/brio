"use client";

import { ShoppingBag, TrendingUp, UserPlus, Wallet } from "lucide-react";
import { useState } from "react";

import { Hero } from "@/components/ui/hero";
import { LoadFailed } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { QuoteBlock } from "@/components/ui/quote-block";
import { RangePicker } from "@/components/ui/range-picker";
import { RangePrompt } from "@/components/ui/range-prompt";
import { SkeletonRows } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { UI_TEXT } from "@/constants/messages";
import { useRememberedRange } from "@/hooks/useRememberedRange";
import type { Interval } from "@/lib/dates/range";
import { formatPaise } from "@/lib/format/currency";
import { apiRoutes, withQuery } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

import { percentChange } from "../summary";
import type { AnalyticsReport, Figure } from "../types";
import { CustomersPanel, OrdersPanel, OverviewPanel, ProductsPanel, SalesPanel } from "./AnalyticsPanels";

const TABS = ["OVERVIEW", "SALES", "ORDERS", "CUSTOMERS", "PRODUCTS"] as const;
type Tab = (typeof TABS)[number];

const text = UI_TEXT.analytics;

function delta(figure: Figure) {
  const change = percentChange(figure);
  return change === undefined ? undefined : { change, since: text.vsPrevious };
}

/**
 * Analytics (plan §139.10, §139.11.11): the compact band, the period — kept
 * for this screen on this device — and five views of it. Overview carries the
 * four figures with their change on the period before (IMP-10), the sales
 * trend and the best sellers; Sales, Orders, Customers and Products each look
 * closer. Everything is worked out on the server (`GET
 * /api/analytics/overview`), in the business's calendar.
 */
export function Analytics() {
  const [range, setRange] = useRememberedRange("analytics");
  const [interval, setInterval] = useState<Interval | undefined>();
  const [tab, setTab] = useState<Tab>("OVERVIEW");

  // A custom period waits for both its dates before it is asked for, as
  // Expenses and Guest sales wait: half a period is not a question.
  const waiting = range.preset === "CUSTOM" && (!range.from || !range.to);
  const report = useApiQuery<AnalyticsReport>(
    waiting
      ? null
      : withQuery(apiRoutes.analytics.overview, {
          range: range.preset,
          from: range.preset === "CUSTOM" ? range.from : undefined,
          to: range.preset === "CUSTOM" ? range.to : undefined,
          interval,
        }),
    { keepPreviousData: true },
  );
  const data = report.data;

  const choose = (next: typeof range) => {
    setRange(next);
    setInterval(undefined);
  };

  return (
    <div className="space-y-6">
      <PageHeader title={text.title} subtitle={text.subtitle}>
        <RangePicker value={range} onChange={choose} />
      </PageHeader>
      <Hero variant="band" lines={text.bandLines} tagline={text.bandTagline} plate="cake-table" />

      <Tabs
        id="analytics"
        label={text.tabs}
        value={tab}
        onChange={setTab}
        options={TABS.map((value) => ({ value, label: text.tabNames[value] }))}
      />

      {waiting ? (
        <RangePrompt />
      ) : data ? (
        <TabPanel id="analytics" value={tab}>
          <div className="space-y-6">
            {tab === "OVERVIEW" && (
              <>
                <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                  <StatTile
                    label={text.totalSales}
                    value={formatPaise(data.kpis.sales.value)}
                    icon={TrendingUp}
                    tone="success"
                    headline
                    delta={delta(data.kpis.sales)}
                    trend={data.salesTrend.map((group) => group.value)}
                  />
                  <StatTile
                    label={text.totalOrders}
                    value={String(data.kpis.orders.value)}
                    icon={ShoppingBag}
                    delta={delta(data.kpis.orders)}
                  />
                  <StatTile
                    label={text.newCustomers}
                    value={String(data.kpis.newCustomers.value)}
                    icon={UserPlus}
                    delta={delta(data.kpis.newCustomers)}
                  />
                  <StatTile
                    label={text.averageOrder}
                    value={formatPaise(data.kpis.averageOrder.value)}
                    icon={Wallet}
                    headline
                    delta={delta(data.kpis.averageOrder)}
                  />
                </dl>
                <OverviewPanel report={data} onInterval={setInterval} onAllProducts={() => setTab("PRODUCTS")} />
                <QuoteBlock quote={text.quote} plate="brownies" />
              </>
            )}
            {tab === "SALES" && <SalesPanel report={data} onInterval={setInterval} />}
            {tab === "ORDERS" && <OrdersPanel report={data} />}
            {tab === "CUSTOMERS" && <CustomersPanel report={data} />}
            {tab === "PRODUCTS" && <ProductsPanel report={data} />}
          </div>
        </TabPanel>
      ) : report.error ? (
        <LoadFailed query={report} loadFailed="ANALYTICS_LOAD_FAILED" />
      ) : (
        <div role="status" aria-busy="true" aria-label={text.loading}>
          <SkeletonRows rows={3} height="h-32" />
        </div>
      )}
    </div>
  );
}
