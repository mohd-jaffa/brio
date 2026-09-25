import type { Tenant } from "@/lib/supabase/tenant";
import { type OrderRow, type OrderItemRow, type OrderAdjustmentRow } from "./types";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { requireRow } from "@/lib/supabase/writes";
import type { OrderListQuery } from "@/lib/validation";

/**
 * A business's orders, newest first — every one, a single customer's, or the
 * Guest orders (`customer: "guest"`, plan §139.11.3).
 */
export async function findAllOrders(tenant: Tenant, filter: OrderListQuery = {}): Promise<OrderRow[]> {
  const { supabase: client, bakeryId } = tenant;
  let query = client.from("orders").select("*").eq("bakery_id", bakeryId);
  if (filter.customer === "guest") query = query.is("customer_id", null);
  else if (filter.customer) query = query.eq("customer_id", filter.customer);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw fromPostgrestError(error);
  return data as OrderRow[];
}

/**
 * Reads an order by id with items and adjustments.
 */
export async function findOrderById(tenant: Tenant, id: string): Promise<{
  order: OrderRow;
  items: OrderItemRow[];
  adjustments: OrderAdjustmentRow[];
}> {
  const { supabase: client, bakeryId } = tenant;
  const order = await requireRow<OrderRow>(
    client.from("orders").select("*").eq("bakery_id", bakeryId).eq("id", id).maybeSingle(),
    "RECORD_NOT_FOUND",
  );

  const [itemsResponse, adjustmentsResponse] = await Promise.all([
    client.from("order_items").select("*").eq("order_id", id),
    client.from("order_adjustments").select("*").eq("order_id", id),
  ]);

  if (itemsResponse.error) throw fromPostgrestError(itemsResponse.error);
  if (adjustmentsResponse.error) throw fromPostgrestError(adjustmentsResponse.error);

  return {
    order,
    items: itemsResponse.data as OrderItemRow[],
    adjustments: adjustmentsResponse.data as OrderAdjustmentRow[],
  };
}

/**
 * What has been paid against each of several orders, in whole paise. One query
 * for the whole list; an order with no payments is simply absent from the map.
 */
export async function findPaidByOrder(
  tenant: Tenant,
  orderIds: readonly string[],
): Promise<Map<string, number>> {
  const { supabase: client, bakeryId } = tenant;
  const paid = new Map<string, number>();
  if (orderIds.length === 0) return paid;

  const { data, error } = await client
    .from("payments")
    .select("order_id, amount")
    .eq("bakery_id", bakeryId)
    .in("order_id", orderIds);

  if (error) throw fromPostgrestError(error);
  for (const payment of (data ?? []) as { order_id: string; amount: number }[]) {
    paid.set(payment.order_id, (paid.get(payment.order_id) ?? 0) + payment.amount);
  }
  return paid;
}

/** The items and adjustments of several orders at once, for a list view. */
export async function findOrderLines(
  tenant: Tenant,
  orderIds: readonly string[],
): Promise<{ items: OrderItemRow[]; adjustments: OrderAdjustmentRow[] }> {
  const { supabase: client } = tenant;
  if (orderIds.length === 0) return { items: [], adjustments: [] };

  const [itemsResponse, adjustmentsResponse] = await Promise.all([
    client.from("order_items").select("*").in("order_id", orderIds),
    client.from("order_adjustments").select("*").in("order_id", orderIds),
  ]);

  if (itemsResponse.error) throw fromPostgrestError(itemsResponse.error);
  if (adjustmentsResponse.error) throw fromPostgrestError(adjustmentsResponse.error);

  return {
    items: (itemsResponse.data ?? []) as OrderItemRow[],
    adjustments: (adjustmentsResponse.data ?? []) as OrderAdjustmentRow[],
  };
}
