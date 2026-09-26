import { addDaysKey, dayStart, todayKey } from "@/lib/dates/calendar";
import { intervalFor, previousPeriod, resolvePeriod } from "@/lib/dates/range";
import { readAll } from "@/lib/supabase/readAll";
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

/**
 * Analytics for a period (`GET /api/analytics/overview`, plan §139.13): the
 * orders placed from the start of the period before to the end of this one,
 * read with their customers, lines and payments, and the customers added over
 * the same days — each a window at a time past the API's row limit — then
 * summed on the server, in the business's calendar (§133.9 I3). The browser
 * never adds up a raw row.
 */
export async function getAnalytics(tenant: Tenant, query: RangeQuery, now: Date = new Date()): Promise<AnalyticsReport> {
  const { supabase: client, bakeryId } = tenant;
  const range = { preset: query.range, from: query.from, to: query.to };
  const period = resolvePeriod(range, todayKey(now));
  const previous = previousPeriod(range, period);
  const interval = intervalFor(period, query.interval);
  const bounds = { from: dayStart(previous.from), to: dayStart(addDaysKey(period.to, 1)) };

  // Read in windows: a year and the year before can pass the API's row limit.
  const [orders, customers] = await Promise.all([
    readAll<ReportOrder>((from, to) =>
      client
        .from("orders")
        .select(REPORT_COLUMNS)
        .eq("bakery_id", bakeryId)
        .gte("created_at", bounds.from)
        .lt("created_at", bounds.to)
        .order("id", { ascending: true })
        .range(from, to),
    ),
    readAll<{ created_at: string }>((from, to) =>
      client
        .from("customers")
        .select("id, created_at")
        .eq("bakery_id", bakeryId)
        .gte("created_at", bounds.from)
        .lt("created_at", bounds.to)
        .order("id", { ascending: true })
        .range(from, to),
    ),
  ]);

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
