import { apiRoutes } from "@/lib/query/keys";
import { getJson, patchJson, postJson } from "@/lib/api/client";
import type { CreateOrderInput, UpdateOrderStatusInput } from "@/lib/validation";

import type { Order } from "./types";

export const OrdersClient = {
  list: () => getJson<Order[]>(apiRoutes.orders.list),
  getOrder: (id: string) => getJson<Order>(apiRoutes.orders.detail(id)),
  createOrder: (payload: CreateOrderInput) => postJson<Order>(apiRoutes.orders.list, payload),
  updateStatus: (id: string, payload: UpdateOrderStatusInput) =>
    patchJson<Order>(apiRoutes.orders.detail(id), payload),
};
