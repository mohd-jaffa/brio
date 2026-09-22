import type { SupabaseClient } from "@supabase/supabase-js";

import { findAllOrders, findOrderById, findOrderLines } from "./api";
import { mapToOrderModel } from "./mappers";
import type { Order } from "./types";

export async function getOrderById(
  client: SupabaseClient,
  bakeryId: string,
  id: string,
): Promise<Order> {
  const { order, items, adjustments } = await findOrderById(client, bakeryId, id);
  return mapToOrderModel(order, items, adjustments);
}

/**
 * A bakery's orders, each with its lines. The lines come back in two queries
 * for the whole page rather than two per order — and they have to come back at
 * all: the list shows how many items an order has, and the analytics page adds
 * them up, both of which read zero when the lines are left off.
 */
export async function getAllOrders(client: SupabaseClient, bakeryId: string): Promise<Order[]> {
  const orders = await findAllOrders(client, bakeryId);
  const { items, adjustments } = await findOrderLines(
    client,
    orders.map((order) => order.id),
  );

  return orders.map((order) =>
    mapToOrderModel(
      order,
      items.filter((item) => item.order_id === order.id),
      adjustments.filter((adjustment) => adjustment.order_id === order.id),
    ),
  );
}
