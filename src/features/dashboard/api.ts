import { HOME_LIST_LIMITS } from "@/constants/limits";
import { OPEN_STATUSES } from "@/constants/statuses";
import { findPaidByOrder } from "@/features/orders/api";
import { ORDER_LIST_COLUMNS, toOrderListItems, type OrderListRow } from "@/features/orders/list";
import { addDaysKey, dayStart, daysFrom, todayKey } from "@/lib/dates/calendar";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
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
function rows<T>({ data, error }: { data: unknown; error: import("@supabase/supabase-js").PostgrestError | null }): T[] {
  if (error) throw fromPostgrestError(error);
  return (data ?? []) as T[];
}

/**
 * Home (plan §139.10, §20), worked out on the server so the browser never
 * reads every order (§133.9 I4). The period's orders are read once and summed
 * for the tiles and the charts; the orders due, what is owed, the stock and
 * the recent customers each have their own bounded query. Every read goes
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

  const [periodResult, dueResult, dueTodayResult, owingResult, stockResult, productsResult, recentResult] =
    await Promise.all([
      client
        .from("orders")
        .select("total, status, created_at, order_items(product_id, product_name, quantity, subtotal, products(icon_key))")
        .eq("bakery_id", bakeryId)
        .gte("created_at", dayStart(chartStart))
        .lt("created_at", dayStart(tomorrow)),
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
      client
        .from("orders")
        .select("id, total")
        .eq("bakery_id", bakeryId)
        .neq("status", "CANCELLED")
        .neq("payment_status", "PAID"),
      client.from("stock_levels").select("product_id, balance, stocked").eq("bakery_id", bakeryId),
      client.from("products").select("id, name, icon_key, unit").eq("bakery_id", bakeryId).eq("is_active", true),
      client
        .from("orders")
        .select("created_at, customers(id, name)")
        .eq("bakery_id", bakeryId)
        .not("customer_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(HOME_LIST_LIMITS.recentCustomers * 10),
    ]);

  const periodOrders = rows<PeriodOrder>(periodResult);
  const dueRows = rows<OrderListRow>(dueResult);
  if (dueTodayResult.error) throw fromPostgrestError(dueTodayResult.error);
  const owing = rows<{ id: string; total: number }>(owingResult);
  const levels = rows<{ product_id: string; balance: number; stocked: boolean }>(stockResult);
  const products = rows<{ id: string; name: string; icon_key: string | null; unit: string }>(productsResult);
  const recent = rows<{ created_at: string; customers: { id: string; name: string } | null }>(recentResult);

  const recentIds = [...new Set(recent.flatMap((order) => (order.customers ? [order.customers.id] : [])))].slice(
    0,
    HOME_LIST_LIMITS.recentCustomers,
  );
  const [due, paid, customerOrders] = await Promise.all([
    toOrderListItems(tenant, dueRows.slice(0, HOME_LIST_LIMITS.due)),
    findPaidByOrder(
      tenant,
      owing.map((order) => order.id),
    ),
    recentIds.length === 0
      ? Promise.resolve([])
      : client
          .from("orders")
          .select("customer_id")
          .eq("bakery_id", bakeryId)
          .neq("status", "CANCELLED")
          .in("customer_id", recentIds)
          .then((result) => rows<{ customer_id: string }>(result)),
  ]);

  const counts = new Map<string, number>();
  for (const order of customerOrders) counts.set(order.customer_id, (counts.get(order.customer_id) ?? 0) + 1);
  const low = lowStock(levels, products);

  return {
    period: query.period,
    dueToday: dueTodayResult.count ?? 0,
    sales: periodSales(periodOrders, start),
    toCollect: owing.reduce((sum, order) => sum + Math.max(0, order.total - (paid.get(order.id) ?? 0)), 0),
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
