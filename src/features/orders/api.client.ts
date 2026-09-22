import { fetcher } from "@/shared/api/client";
import { type Order } from "@/features/orders/types";
import { type CreateOrderInput, type UpdateOrderStatusInput } from "@/lib/validation";

export const OrdersClient = {
  async getOrder(id: string): Promise<Order> {
    return fetcher<Order>(`/api/orders/${id}`);
  },

  async createOrder(payload: CreateOrderInput): Promise<{ id: string }> {
    return fetcher<{ id: string }>("/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateStatus(id: string, payload: UpdateOrderStatusInput): Promise<void> {
    return fetcher(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
