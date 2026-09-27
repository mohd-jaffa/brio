import { apiRoutes } from "@/lib/query/keys";
import { getJson, patchJson, postJson, postOnce, putJson } from "@/lib/api/client";
import type { CreateOrderInput, UpdateOrderInput, UpdateOrderStatusInput } from "@/lib/validation";

import type { OrderEstimate } from "./estimate";
import type { Order } from "./types";

export const OrdersClient = {
  getOrder: (id: string) => getJson<Order>(apiRoutes.orders.detail(id)),
  /** The same key sent again returns the order the first made (§133.3 C2). */
  createOrder: (payload: CreateOrderInput, idempotencyKey: string) =>
    postOnce<Order>(apiRoutes.orders.list, payload, idempotencyKey),
  /** The estimate: priced and stock-checked by the server, stored nowhere (§139.11.5). */
  preview: (payload: CreateOrderInput) => postJson<OrderEstimate>(apiRoutes.orders.preview, payload),
  /** The whole open order as it should now stand; sent again, it changes nothing more (§139.11.13). */
  updateOrder: (id: string, payload: UpdateOrderInput) => putJson<Order>(apiRoutes.orders.detail(id), payload),
  updateStatus: (id: string, payload: UpdateOrderStatusInput) =>
    patchJson<Order>(apiRoutes.orders.detail(id), payload),
};
