import { HOME_LIST_LIMITS } from "@/constants/limits";
import { OPEN_STATUSES } from "@/constants/statuses";
import { ORDER_LIST_COLUMNS, toOrderListItems, type OrderListRow } from "@/features/orders/list";
import { addDaysKey, dayStart, daysFrom, todayKey } from "@/lib/dates/calendar";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { sumPaise } from "@/lib/money";
import { readAll } from "@/lib/supabase/readAll";
import type { Tenant } from "@/lib/supabase/tenant";
import type { DashboardQuery } from "@/lib/validation";

import {
  groupDue,
  lowStock,
  ordersByStatus,
  periodDays,
  periodSales,
  recentCustomers,
  salesByDay,
  topProducts,
  type PeriodOrder,
} from "./summary";
import type { Dashboard } from "./types";

/** A query's answer, or the failure in the app's own words (AGENTS.md §10). */
function rows<T>({
  data,
  error,
}: {
  data: unknown;
  error: import("@supabase/supabase-js").PostgrestError | null;
}): T[] {
  if (error) throw fromPostgrestError(error);
  return (data ?? []) as T[];
}

/**
 * Home (plan §139.10, §20), worked out on the server so the browser never
 * reads every order (§133.9 I4). The period's orders are read — a window at a
 * time past the API's row limit — and summed for the tiles and the charts;
 * what is owed is read the same way, each order with its payments. The
 * orders due, the stock (`stock_levels`) and the recent customers
 * (`customer_stats`) each have their own bounded query. Every read goes
 * through the caller's client, so RLS keeps it to their own business.
 */
export async function getDashboard(tenant: Tenant, query: DashboardQuery, now: Date = new Date()): Promise<Dashboard> {
  const { supabase: client, bakeryId } = tenant;
  const today = todayKey(now);
  const tomorrow = addDaysKey(today, 1);
  const { start, chartStart } = periodDays(query.period, today);

  let dueQuery = client
    .from("orders")
    .select(ORDER_LIST_COLUMNS)
    .eq("bakery_id", bakeryId)
    .in("status", query.status ? [query.status] : [...OPEN_STATUSES])
    .lt("delivery_date", dayStart(addDaysKey(tomorrow, 1)));
  if (query.payment) dueQuery = dueQuery.eq("payment_status", query.payment);

  // The period's orders and what is still owed are read a window at a time,
  // since either can pass the API's row limit; the rest are bounded.
  const [periodOrders, dueResult, dueTodayResult, owing, stockResult, productsResult, recentResult] = await Promise.all(
    [
      readAll<PeriodOrder>((from, to) =>
        client
          .from("orders")
          .select(
            "id, total, status, created_at, order_items(product_id, product_name, quantity, subtotal, products(icon_key))",
          )
          .eq("bakery_id", bakeryId)
          .gte("created_at", dayStart(chartStart))
          .lt("created_at", dayStart(tomorrow))
          .order("id", { ascending: true })
          .range(from, to),
      ),
      dueQuery
        .order("delivery_date", { ascending: true })
        .order("id", { ascending: true })
        .limit(HOME_LIST_LIMITS.due + 1),
      client
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("bakery_id", bakeryId)
        .in("status", [...OPEN_STATUSES])
        .gte("delivery_date", dayStart(today))
        .lt("delivery_date", dayStart(tomorrow)),
      readAll<{ id: string; total: number; payments: { amount: number }[] }>((from, to) =>
        client
          .from("orders")
          .select("id, total, payments(amount)")
          .eq("bakery_id", bakeryId)
          .neq("status", "CANCELLED")
          .neq("payment_status", "PAID")
          .order("id", { ascending: true })
          .range(from, to),
      ),
      client.from("stock_levels").select("product_id, balance, stocked").eq("bakery_id", bakeryId),
      client.from("products").select("id, name, icon_key, unit").eq("bakery_id", bakeryId).eq("is_active", true),
      client
        .from("orders")
        .select("created_at, customers(id, name)")
        .eq("bakery_id", bakeryId)
        .not("customer_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(HOME_LIST_LIMITS.recentCustomers * 10),
    ],
  );

  const dueRows = rows<OrderListRow>(dueResult);
  if (dueTodayResult.error) throw fromPostgrestError(dueTodayResult.error);
  const levels = rows<{ product_id: string; balance: number; stocked: boolean }>(stockResult);
  const products = rows<{ id: string; name: string; icon_key: string | null; unit: string }>(productsResult);
  const recent = rows<{ created_at: string; customers: { id: string; name: string } | null }>(recentResult);

  const recentIds = [...new Set(recent.flatMap((order) => (order.customers ? [order.customers.id] : [])))].slice(
    0,
    HOME_LIST_LIMITS.recentCustomers,
  );
  // Each recent customer's order count, as `customer_stats` (0017) keeps it.
  const [due, customerStats] = await Promise.all([
    toOrderListItems(tenant, dueRows.slice(0, HOME_LIST_LIMITS.due)),
    recentIds.length === 0
      ? Promise.resolve([])
      : client
          .from("customer_stats")
          .select("id, order_count")
          .eq("bakery_id", bakeryId)
          .in("id", recentIds)
          .then((result) => rows<{ id: string; order_count: number }>(result)),
  ]);

  const counts = new Map(customerStats.map((customer) => [customer.id, customer.order_count]));
  const low = lowStock(levels, products);

  return {
    period: query.period,
    dueToday: dueTodayResult.count ?? 0,
    sales: periodSales(periodOrders, start),
    toCollect: sumPaise(
      owing.map((order) => Math.max(0, order.total - sumPaise(order.payments.map((payment) => payment.amount)))),
    ),
    lowStockCount: low.length,
    salesByDay: salesByDay(periodOrders, daysFrom(chartStart, today)),
    due: groupDue(due, now),
    moreDue: dueRows.length > HOME_LIST_LIMITS.due,
    lowStock: low.slice(0, HOME_LIST_LIMITS.lowStock),
    topProducts: topProducts(periodOrders, start),
    ordersByStatus: ordersByStatus(periodOrders, start),
    recentCustomers: recentCustomers(recent, counts),
  };
}
