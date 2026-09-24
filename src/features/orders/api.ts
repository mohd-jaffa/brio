import { type SupabaseClient } from "@supabase/supabase-js";
import { type OrderRow, type OrderItemRow, type OrderAdjustmentRow } from "./types";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { requireRow } from "@/lib/supabase/writes";
import { pickColumns } from "@/lib/supabase/columns";
import { EDITABLE_COLUMNS } from "@/constants/editableColumns";
import { conflictError } from "@/lib/errors";

/**
 * Reads all orders for a tenant sorted by created_at descending.
 */
export async function findAllOrders(client: SupabaseClient, bakeryId: string): Promise<OrderRow[]> {
  const { data, error } = await client
    .from("orders")
    .select("*")
    .eq("bakery_id", bakeryId)
    .order("created_at", { ascending: false });

  if (error) throw fromPostgrestError(error);
  return data as OrderRow[];
}

/**
 * Reads an order by id with items and adjustments.
 */
export async function findOrderById(client: SupabaseClient, bakeryId: string, id: string): Promise<{
  order: OrderRow;
  items: OrderItemRow[];
  adjustments: OrderAdjustmentRow[];
}> {
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
 * Inserts a new order row.
 */
export async function insertOrder(
  client: SupabaseClient, 
  bakeryId: string, 
  payload: Omit<OrderRow, "id" | "bakery_id" | "created_at" | "updated_at">
): Promise<OrderRow> {
  const { data, error } = await client
    .from("orders")
    .insert({ ...payload, bakery_id: bakeryId })
    .select()
    .single();

  if (error) throw fromPostgrestError(error);
  return data as OrderRow;
}

/**
 * Inserts order items array.
 */
export async function insertOrderItems(
  client: SupabaseClient, 
  items: Omit<OrderItemRow, "id" | "created_at">[]
): Promise<OrderItemRow[]> {
  if (items.length === 0) return [];
  const { data, error } = await client
    .from("order_items")
    .insert(items)
    .select();

  if (error) throw fromPostgrestError(error);
  return data as OrderItemRow[];
}

/**
 * Inserts order adjustments array.
 */
export async function insertOrderAdjustments(
  client: SupabaseClient, 
  adjustments: Omit<OrderAdjustmentRow, "id" | "created_at">[]
): Promise<OrderAdjustmentRow[]> {
  if (adjustments.length === 0) return [];
  const { data, error } = await client
    .from("order_adjustments")
    .insert(adjustments)
    .select();

  if (error) throw fromPostgrestError(error);
  return data as OrderAdjustmentRow[];
}

/**
 * Updates an order status / payment status safely using pickColumns and requireRow.
 */
export async function updateOrder(
  client: SupabaseClient,
  bakeryId: string,
  id: string,
  payload: Partial<Pick<OrderRow, "status" | "payment_status">>
): Promise<OrderRow> {
  const patch = pickColumns(payload, EDITABLE_COLUMNS.orders);

  return requireRow<OrderRow>(
    client
      .from("orders")
      .update(patch)
      .eq("bakery_id", bakeryId)
      .eq("id", id)
      .select()
      .maybeSingle(),
    "RECORD_NOT_FOUND"
  );
}

/**
 * Moves an order to a new status only if it is still where it was read. Two
 * taps, or two devices, cannot both apply the same move — the second finds the
 * order already moved, changes nothing, and is told so — so the stock that
 * follows a move is never posted twice.
 */
export async function moveOrderStatus(
  client: SupabaseClient,
  bakeryId: string,
  id: string,
  from: OrderRow["status"],
  to: OrderRow["status"],
): Promise<OrderRow> {
  const { data, error } = await client
    .from("orders")
    .update({ status: to })
    .eq("bakery_id", bakeryId)
    .eq("id", id)
    .eq("status", from)
    .select()
    .maybeSingle();

  if (error) throw fromPostgrestError(error);
  if (data === null) throw conflictError("ORDER_STATUS_CHANGED", { from, to });
  return data as OrderRow;
}

/**
 * Performs hard delete of an order (for rollback or dev cleanup).
 */
export async function deleteOrderHard(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("orders").delete().eq("id", id);
  if (error) throw fromPostgrestError(error);
}

/**
 * Generates next sequential order number.
 */
export async function generateOrderNumber(client: SupabaseClient, bakeryId: string): Promise<string> {
  const { count, error } = await client
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("bakery_id", bakeryId);

  if (error) throw fromPostgrestError(error);
  
  const baseNumber = (count ?? 0) + 1;
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `#${baseNumber}-${randomSuffix}`;
}

/**
 * What has been paid against each of several orders, in whole paise. One query
 * for the whole list; an order with no payments is simply absent from the map.
 */
export async function findPaidByOrder(
  client: SupabaseClient,
  bakeryId: string,
  orderIds: readonly string[],
): Promise<Map<string, number>> {
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
  client: SupabaseClient,
  orderIds: readonly string[],
): Promise<{ items: OrderItemRow[]; adjustments: OrderAdjustmentRow[] }> {
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
