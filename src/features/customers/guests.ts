import type { PostgrestError } from "@supabase/supabase-js";

import { ORDER_LIST_COLUMNS, toOrderListItems, type OrderListRow } from "@/features/orders/list";
import { pageWindow, toPage } from "@/lib/api/pagination";
import { addDaysKey, dayStart, todayKey } from "@/lib/dates/calendar";
import { resolvePeriod } from "@/lib/dates/range";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { sumPaise } from "@/lib/money";
import { readAll } from "@/lib/supabase/readAll";
import type { Tenant } from "@/lib/supabase/tenant";
import type { PagedRangeQuery } from "@/lib/validation";

import type { GuestSales } from "./types";

function rows<T>({ data, error }: { data: unknown; error: PostgrestError | null }): T[] {
  if (error) throw fromPostgrestError(error);
  return (data ?? []) as T[];
}

/**
 * Guest sales (`GET /api/guest-sales`, plan §139.11.3): the orders placed with
 * no customer in the period, in the business's calendar, cancelled ones left
 * out as they are from every sales figure. The count and the total are read
 * from the orders' totals alone; the page is read as any list of orders is.
 */
export async function getGuestSales(
  tenant: Tenant,
  query: PagedRangeQuery,
  now: Date = new Date(),
): Promise<GuestSales> {
  const { supabase: client, bakeryId } = tenant;
  const period = resolvePeriod({ preset: query.range, from: query.from, to: query.to }, todayKey(now));
  const window = pageWindow(query.cursor);
  const placed = (columns: string) =>
    client
      .from("orders")
      .select(columns)
      .eq("bakery_id", bakeryId)
      .is("customer_id", null)
      .neq("status", "CANCELLED")
      .gte("created_at", dayStart(period.from))
      .lt("created_at", dayStart(addDaysKey(period.to, 1)));

  const [pageResult, totals] = await Promise.all([
    placed(ORDER_LIST_COLUMNS)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(window.from, window.to),
    // Every Guest order's total, a window at a time: a year of them can pass the API's row limit.
    readAll<{ total: number }>((from, to) => placed("id, total").order("id", { ascending: true }).range(from, to)),
  ]);
  const page = toPage(rows<OrderListRow>(pageResult), query.cursor);

  return {
    period,
    orders: totals.length,
    sales: sumPaise(totals.map((order) => order.total)),
    items: await toOrderListItems(tenant, page.items),
    nextCursor: page.nextCursor,
  };
}
