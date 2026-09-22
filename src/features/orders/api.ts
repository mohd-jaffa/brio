import { type SupabaseClient } from "@supabase/supabase-js";
import { type OrderRow, type OrderItemRow, type OrderAdjustmentRow } from "./types";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { requireRow } from "@/lib/supabase/writes";
import { pickColumns } from "@/lib/supabase/columns";
import { EDITABLE_COLUMNS } from "@/constants/editableColumns";

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
  const { data: order, error: orderError } = await client
    .from("orders")
    .select("*")
    .eq("bakery_id", bakeryId)
    .eq("id", id)
    .maybeSingle();

  if (orderError) throw fromPostgrestError(orderError);
  const validatedOrder = await requireRow<OrderRow>(
    Promise.resolve({ data: order, error: null } as any),
    "RECORD_NOT_FOUND"
  );

  const [itemsResponse, adjustmentsResponse] = await Promise.all([
    client.from("order_items").select("*").eq("order_id", id),
    client.from("order_adjustments").select("*").eq("order_id", id),
  ]);

  if (itemsResponse.error) throw fromPostgrestError(itemsResponse.error);
  if (adjustmentsResponse.error) throw fromPostgrestError(adjustmentsResponse.error);

  return {
    order: validatedOrder,
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
