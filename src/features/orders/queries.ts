import { type SupabaseClient } from "@supabase/supabase-js";
import { type Order } from "./types";
import { findOrderById, findAllOrders } from "./api";
import { mapToOrderModel } from "./mappers";

export async function getOrderById(client: SupabaseClient, bakeryId: string, id: string): Promise<Order> {
  const { order, items, adjustments } = await findOrderById(client, bakeryId, id);
  return mapToOrderModel(order, items, adjustments);
}

export async function getAllOrders(client: SupabaseClient, bakeryId: string): Promise<Order[]> {
  const orders = await findAllOrders(client, bakeryId);
  // Ideally we'd fetch items for all, but for list view we just map what we have
  return orders.map(o => mapToOrderModel(o, [], []));
}
