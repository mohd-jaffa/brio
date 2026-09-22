import { type SupabaseClient } from "@supabase/supabase-js";
import { type OrderRow, type OrderItemRow, type OrderAdjustmentRow } from "./types";
import { ExternalServiceError, NotFoundError } from "@/shared/errors/app-error";

function mapDatabaseError(error: unknown) {
  return new ExternalServiceError("EXTERNAL_SERVICE_ERROR", undefined, error);
}

export async function findAllOrders(client: SupabaseClient, bakeryId: string): Promise<OrderRow[]> {
  const { data, error } = await client
    .from("orders")
    .select("*")
    .eq("bakery_id", bakeryId)
    .order("created_at", { ascending: false });

  if (error) throw mapDatabaseError(error);
  return data as OrderRow[];
}

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

  if (orderError) throw mapDatabaseError(orderError);
  if (!order) throw new NotFoundError("NOT_FOUND", "Order not found");

  const [itemsResponse, adjustmentsResponse] = await Promise.all([
    client.from("order_items").select("*").eq("order_id", id),
    client.from("order_adjustments").select("*").eq("order_id", id),
  ]);

  if (itemsResponse.error) throw mapDatabaseError(itemsResponse.error);
  if (adjustmentsResponse.error) throw mapDatabaseError(adjustmentsResponse.error);

  return {
    order: order as OrderRow,
    items: itemsResponse.data as OrderItemRow[],
    adjustments: adjustmentsResponse.data as OrderAdjustmentRow[],
  };
}

export async function insertOrder(client: SupabaseClient, bakeryId: string, payload: Omit<OrderRow, "id" | "bakery_id" | "created_at" | "updated_at">): Promise<OrderRow> {
  const { data, error } = await client
    .from("orders")
    .insert({ ...payload, bakery_id: bakeryId })
    .select()
    .single();

  if (error) throw mapDatabaseError(error);
  return data as OrderRow;
}

export async function insertOrderItems(client: SupabaseClient, items: Omit<OrderItemRow, "id" | "created_at">[]): Promise<OrderItemRow[]> {
  if (items.length === 0) return [];
  const { data, error } = await client
    .from("order_items")
    .insert(items)
    .select();

  if (error) throw mapDatabaseError(error);
  return data as OrderItemRow[];
}

export async function insertOrderAdjustments(client: SupabaseClient, adjustments: Omit<OrderAdjustmentRow, "id" | "created_at">[]): Promise<OrderAdjustmentRow[]> {
  if (adjustments.length === 0) return [];
  const { data, error } = await client
    .from("order_adjustments")
    .insert(adjustments)
    .select();

  if (error) throw mapDatabaseError(error);
  return data as OrderAdjustmentRow[];
}

export async function updateOrder(
  client: SupabaseClient,
  bakeryId: string,
  id: string,
  payload: Partial<Pick<OrderRow, "status" | "payment_status">>
): Promise<OrderRow> {
  const { data, error } = await client
    .from("orders")
    .update(payload)
    .eq("bakery_id", bakeryId)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw mapDatabaseError(error);
  if (!data) throw new NotFoundError("NOT_FOUND", "Order not found");

  return data as OrderRow;
}

export async function deleteOrderHard(client: SupabaseClient, id: string): Promise<void> {
  await client.from("orders").delete().eq("id", id);
}

export async function generateOrderNumber(client: SupabaseClient, bakeryId: string): Promise<string> {
  const { count, error } = await client
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("bakery_id", bakeryId);

  if (error) throw mapDatabaseError(error);
  
  const baseNumber = (count ?? 0) + 1;
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `#\${baseNumber}-\${randomSuffix}`;
}
