import type { Tenant } from "@/lib/supabase/tenant";
import type { OrderListQuery } from "@/lib/validation";

import { findAllOrders, findOrderById, findOrderLines, findPaidByOrder } from "./api";
import { mapToOrderModel } from "./mappers";
import type { Order } from "./types";

export async function getOrderById(
  tenant: Tenant,
  id: string,
): Promise<Order> {
  const [{ order, items, adjustments }, paid] = await Promise.all([
    findOrderById(tenant, id),
    findPaidByOrder(tenant, [id]),
  ]);
  return mapToOrderModel(order, items, adjustments, paid.get(id));
}

/**
 * A bakery's orders, each with its lines and what has been paid. The lines and
 * payments come back in one query each for the whole page rather than per
 * order — and they have to come back at all: the list shows how many items an
 * order has, the analytics page adds them up, and the dashboard needs what is
 * still owed, all of which read zero when they are left off.
 */
export async function getAllOrders(tenant: Tenant, filter: OrderListQuery = {}): Promise<Order[]> {
  const orders = await findAllOrders(tenant, filter);
  const ids = orders.map((order) => order.id);
  const [{ items, adjustments }, paid] = await Promise.all([
    findOrderLines(tenant, ids),
    findPaidByOrder(tenant, ids),
  ]);

  return orders.map((order) =>
    mapToOrderModel(
      order,
      items.filter((item) => item.order_id === order.id),
      adjustments.filter((adjustment) => adjustment.order_id === order.id),
      paid.get(order.id),
    ),
  );
}
