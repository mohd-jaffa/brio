import type { Tenant } from "@/lib/supabase/tenant";

import { findOrderById, findPaidByOrder } from "./api";
import { mapToOrderModel } from "./mappers";
import type { Order } from "./types";

export async function getOrderById(tenant: Tenant, id: string): Promise<Order> {
  const [{ order, items, adjustments }, paid] = await Promise.all([
    findOrderById(tenant, id),
    findPaidByOrder(tenant, [id]),
  ]);
  return mapToOrderModel(order, items, adjustments, paid.get(id));
}
