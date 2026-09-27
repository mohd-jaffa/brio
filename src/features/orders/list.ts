import type { PostgrestError } from "@supabase/supabase-js";

import { OPEN_STATUSES, ORDER_STATUSES, type OrderStatus } from "@/constants/statuses";
import { pageWindow, toPage, type Page } from "@/lib/api/pagination";
import { addDaysKey, dayStart } from "@/lib/dates/calendar";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { containsPattern, ilikeFilter, phoneDigits } from "@/lib/supabase/search";
import type { Tenant } from "@/lib/supabase/tenant";
import type { OrderCountsQuery, OrderListQuery } from "@/lib/validation";

import { findPaidByOrder } from "./api";
import type { OrderCounts, OrderListItem, OrderRow } from "./types";

/**
 * What a list reads of each order (plan §139.10): the order's own columns, its
 * customer's name, and its lines with each product's illustration — in one
 * request, so a page of orders is one query and one more for the payments.
 */
export const ORDER_LIST_COLUMNS =
  "id, order_number, status, delivery_type, delivery_date, total, payment_status, created_at, customer_id, customers(id, name), order_items(product_name, product_id, position, products(icon_key))";

type ListColumns =
  | "id"
  | "order_number"
  | "status"
  | "delivery_type"
  | "delivery_date"
  | "total"
  | "payment_status"
  | "created_at"
  | "customer_id";

export type OrderListRow = Pick<OrderRow, ListColumns> & {
  customers: { id: string; name: string } | null;
  order_items: {
    product_name: string;
    product_id: string | null;
    /** The order the lines were put in (0025). */
    position: number;
    products: { icon_key: string | null } | null;
  }[];
};

/** One row as a list draws it, given what has been paid on it. */
export function toOrderListItem(row: OrderListRow, paid = 0): OrderListItem {
  const [first] = [...row.order_items].sort((a, b) => a.position - b.position);
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    deliveryType: row.delivery_type,
    dueAt: row.delivery_date,
    customer: row.customers ? { id: row.customers.id, name: row.customers.name } : null,
    firstItem: first
      ? { name: first.product_name, iconKey: first.products?.icon_key ?? null, custom: first.product_id === null }
      : null,
    lineCount: row.order_items.length,
    total: row.total,
    paymentStatus: row.payment_status,
    balanceDue: row.status === "CANCELLED" ? 0 : Math.max(0, row.total - paid),
    createdAt: row.created_at,
  };
}

/** Rows read with `ORDER_LIST_COLUMNS`, with what has been paid on each. */
export async function toOrderListItems(tenant: Tenant, rows: readonly OrderListRow[]): Promise<OrderListItem[]> {
  const paid = await findPaidByOrder(
    tenant,
    rows.map((row) => row.id),
  );
  return rows.map((row) => toOrderListItem(row, paid.get(row.id)));
}

/** Orders beside their customer's name and phone, so one filter can search all three (0017_list_views.sql). */
const SEARCHABLE = "order_search";

/**
 * An order's number, or who it is for — by name, or by the digits of their
 * phone however they were typed (BUG-23) — as one PostgREST `or` filter; null
 * when the search leaves nothing to look for.
 */
export function orderSearchFilter(search: string | null): string | null {
  const pattern = search ? containsPattern(search) : null;
  if (!search || !pattern) return null;
  const digits = phoneDigits(search);
  return [
    ilikeFilter("order_number", pattern),
    ilikeFilter("customer_name", pattern),
    ...(digits ? [`customer_phone.like."%${digits}%"`] : []),
  ].join(",");
}

/**
 * The builder calls these lists make on the search view, typed here: the
 * client's own generics, inferred through a select string on a view, run
 * deeper than TypeScript will follow.
 */
interface OrderQuery extends PromiseLike<{ data: unknown; error: PostgrestError | null; count: number | null }> {
  eq(column: string, value: string): OrderQuery;
  is(column: string, value: null): OrderQuery;
  gte(column: string, value: string): OrderQuery;
  lt(column: string, value: string): OrderQuery;
  or(filters: string): OrderQuery;
  order(column: string, options: { ascending: boolean }): OrderQuery;
  range(from: number, to: number): OrderQuery;
}

/** The search view, kept to the business, then to whose orders, how paid, when due and what was searched for. */
function searchable(tenant: Tenant, filters: OrderCountsQuery, columns: string, head = false): OrderQuery {
  const select = tenant.supabase.from(SEARCHABLE).select(columns, head ? { count: "exact", head: true } : undefined);
  let query = (select as unknown as OrderQuery).eq("bakery_id", tenant.bakeryId);
  if (filters.customer === "guest") query = query.is("customer_id", null);
  else if (filters.customer) query = query.eq("customer_id", filters.customer);
  if (filters.payment) query = query.eq("payment_status", filters.payment);
  if (filters.from) query = query.gte("delivery_date", dayStart(filters.from));
  if (filters.to) query = query.lt("delivery_date", dayStart(addDaysKey(filters.to, 1)));
  const search = orderSearchFilter(filters.search);
  return search ? query.or(search) : query;
}

/**
 * A page of orders (plan §139.10, §133.9 I4). Every order comes newest first;
 * an open status soonest due first, as the work will be done; delivered and
 * cancelled the most recently due first. The id breaks ties, so a page never
 * repeats or skips an order.
 */
export async function listOrders(tenant: Tenant, query: OrderListQuery): Promise<Page<OrderListItem>> {
  const { from, to } = pageWindow(query.cursor);
  let request = searchable(tenant, query, ORDER_LIST_COLUMNS);
  if (query.status) request = request.eq("status", query.status);
  const byDue = query.status !== undefined;
  const ascending = (OPEN_STATUSES as readonly (OrderStatus | undefined)[]).includes(query.status);

  const { data, error } = await request
    .order(byDue ? "delivery_date" : "created_at", { ascending })
    .order("id", { ascending: true })
    .range(from, to);
  if (error) throw fromPostgrestError(error);

  const page = toPage(data as OrderListRow[], query.cursor);
  return { ...page, items: await toOrderListItems(tenant, page.items) };
}

/** How many orders each tab holds under the same filters, counted in the database, all at once. */
export async function countOrders(tenant: Tenant, filters: OrderCountsQuery): Promise<OrderCounts> {
  const count = async (status?: OrderStatus) => {
    let request = searchable(tenant, filters, "id", true);
    if (status) request = request.eq("status", status);
    const { count: found, error } = await request;
    if (error) throw fromPostgrestError(error);
    return found ?? 0;
  };
  const [all, ...each] = await Promise.all([count(), ...ORDER_STATUSES.map((status) => count(status))]);
  return { ALL: all, ...Object.fromEntries(ORDER_STATUSES.map((status, index) => [status, each[index]])) } as OrderCounts;
}
