import type { Tenant } from "@/lib/supabase/tenant";

import { findPaidByOrder } from "./api";
import type { OrderListItem, OrderRow } from "./types";

/**
 * What a list reads of each order (plan §139.10): the order's own columns, its
 * customer's name, and its lines with each product's illustration — in one
 * request, so a page of orders is one query and one more for the payments.
 */
export const ORDER_LIST_COLUMNS =
  "id, order_number, status, delivery_type, delivery_date, total, payment_status, created_at, customer_id, customers(id, name), order_items(product_name, product_id, created_at, products(icon_key))";

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
    created_at: string;
    products: { icon_key: string | null } | null;
  }[];
};

/** One row as a list draws it, given what has been paid on it. */
export function toOrderListItem(row: OrderListRow, paid = 0): OrderListItem {
  const [first] = [...row.order_items].sort((a, b) => a.created_at.localeCompare(b.created_at));
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
