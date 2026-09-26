import type { PostgrestError } from "@supabase/supabase-js";

import { addDaysKey, dayStart, todayKey } from "@/lib/dates/calendar";
import { intervalFor, previousPeriod, resolvePeriod } from "@/lib/dates/range";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import type { Tenant } from "@/lib/supabase/tenant";
import type { RangeQuery } from "@/lib/validation";

import {
  collection,
  customerMix,
  guestSplit,
  handover,
  headlineFigures,
  placedIn,
  productSales,
  salesTrend,
  statusCounts,
  topCustomers,
  trend,
  counted,
  type ReportOrder,
} from "./summary";
import type { AnalyticsReport } from "./types";

const REPORT_COLUMNS =
  "total, status, created_at, delivery_type, customer_id, customers(id, name, created_at), order_items(product_id, product_name, quantity, subtotal, products(icon_key)), payments(amount)";

function rows<T>({ data, error }: { data: unknown; error: PostgrestError | null }): T[] {
  if (error) throw fromPostgrestError(error);
  return (data ?? []) as T[];
}

/**
 * Analytics for a period (`GET /api/analytics/overview`, plan §139.13): the
 * orders placed from the start of the period before to the end of this one,
 * read once with their customers, lines and payments, and the customers added
 * over the same days — then summed on the server, in the business's calendar
 * (§133.9 I3). The browser never adds up a raw row.
 */
export async function getAnalytics(tenant: Tenant, query: RangeQuery, now: Date = new Date()): Promise<AnalyticsReport> {
  const { supabase: client, bakeryId } = tenant;
  const range = { preset: query.range, from: query.from, to: query.to };
  const period = resolvePeriod(range, todayKey(now));
  const previous = previousPeriod(range, period);
  const interval = intervalFor(period, query.interval);
  const bounds = { from: dayStart(previous.from), to: dayStart(addDaysKey(period.to, 1)) };

  const [ordersResult, customersResult] = await Promise.all([
    client
      .from("orders")
      .select(REPORT_COLUMNS)
      .eq("bakery_id", bakeryId)
      .gte("created_at", bounds.from)
      .lt("created_at", bounds.to),
    client
      .from("customers")
      .select("created_at")
      .eq("bakery_id", bakeryId)
      .gte("created_at", bounds.from)
      .lt("created_at", bounds.to),
  ]);
  const orders = rows<ReportOrder>(ordersResult);
  const customers = rows<{ created_at: string }>(customersResult);

  const current = placedIn(orders, period);
  const before = placedIn(orders, previous);

  return {
    period,
    previous,
    interval,
    kpis: headlineFigures(current, before, {
      value: placedIn(customers, period).length,
      previous: placedIn(customers, previous).length,
    }),
    salesTrend: salesTrend(current, before, period, previous, interval),
    ordersTrend: trend(counted(current), period, interval, () => 1),
    products: productSales(current),
    ordersByStatus: statusCounts(current),
    handover: handover(current),
    guestSplit: guestSplit(current),
    collection: collection(current),
    customerMix: customerMix(current, period),
    topCustomers: topCustomers(current),
  };
}
