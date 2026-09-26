"use client";

import { ShoppingBag, TrendingUp } from "lucide-react";
import { useState } from "react";

import { ListScreen } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { RangePicker } from "@/components/ui/range-picker";
import { RowList } from "@/components/ui/row";
import { SkeletonRows } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import { UI_TEXT } from "@/constants/messages";
import { OrderRow } from "@/features/orders/components/OrderRow";
import type { OrderListItem } from "@/features/orders/types";
import { useRememberedRange } from "@/hooks/useRememberedRange";
import { formatPaise } from "@/lib/format/currency";
import { apiRoutes, withQuery } from "@/lib/query/keys";
import { useApiPages } from "@/lib/query/useApiPages";

import type { GuestSales as GuestSalesPage } from "../types";

/**
 * Guest sales (plan §139.11.3, R5.5): for the period — kept for this screen on
 * this device — how many orders Guests placed and what they came to, then
 * those orders as rows, newest first, a page at a time. Cancelled orders are
 * not sales, so they are left out of both.
 */
export function GuestSales() {
  const text = UI_TEXT.guestSales;
  const [range, setRange] = useRememberedRange("guest-sales");
  const [now] = useState(() => new Date());
  // A custom period waits for both its dates before it is asked for.
  const waiting = range.preset === "CUSTOM" && (!range.from || !range.to);

  const sales = useApiPages<OrderListItem, GuestSalesPage>(
    waiting
      ? null
      : withQuery(apiRoutes.guestSales, {
          range: range.preset,
          from: range.preset === "CUSTOM" ? range.from : undefined,
          to: range.preset === "CUSTOM" ? range.to : undefined,
        }),
  );
  const summary = waiting ? undefined : sales.first;

  return (
    <div className="space-y-6">
      <PageHeader title={text.title} subtitle={text.subtitle} back="/customers">
        <RangePicker value={range} onChange={setRange} />
      </PageHeader>

      {summary ? (
        <dl className="grid grid-cols-2 gap-3 lg:max-w-2xl lg:gap-4">
          <StatTile label={text.orders} value={String(summary.orders)} icon={ShoppingBag} />
          <StatTile label={text.sales} value={formatPaise(summary.sales)} icon={TrendingUp} tone="success" headline />
        </dl>
      ) : (
        !sales.error && (
          <div role="status" aria-busy="true" aria-label={text.loading}>
            <SkeletonRows rows={1} height="h-28" />
          </div>
        )
      )}

      <section aria-label={text.list}>
        <ListScreen
          query={{ ...sales, isLoading: sales.isLoading || waiting }}
          loadFailed="ORDERS_LOAD_FAILED"
          data={waiting ? undefined : sales.data}
          empty={
            <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-text-muted shadow-card">
              {text.none}
            </p>
          }
          renderList={(items) => (
            <RowList label={text.list}>
              {items.map((order) => (
                <OrderRow key={order.id} order={order} now={now} />
              ))}
            </RowList>
          )}
        />
      </section>
    </div>
  );
}
