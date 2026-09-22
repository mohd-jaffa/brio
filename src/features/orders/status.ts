import { type SupabaseClient } from "@supabase/supabase-js";
import { type Order } from "./types";
import { updateOrderStatusSchema, type UpdateOrderStatusInput } from "@/lib/validation";
import { logInventoryTransaction } from "@/features/inventory/api";
import { logActionSafe } from "@/features/audit/api";
import { createJob } from "@/features/workers/api";
import { findOrderById, updateOrder } from "./api";
import { mapToOrderModel } from "./mappers";

export async function updateOrderStatus(
  client: SupabaseClient, 
  bakeryId: string, 
  id: string, 
  input: UpdateOrderStatusInput
): Promise<Order> {
  const validated = updateOrderStatusSchema.parse(input);
  const payload: any = {};
  
  if (validated.status) payload.status = validated.status;
  if (validated.paymentStatus) payload.payment_status = validated.paymentStatus;

  const { order: existingOrder, items, adjustments } = await findOrderById(client, bakeryId, id);

  const updatedOrder = await updateOrder(client, bakeryId, id, payload);

  if (validated.status === "DELIVERED" && existingOrder.status !== "DELIVERED") {
    const inventoryPromises = items.map(item => 
      logInventoryTransaction(client, bakeryId, {
        productId: item.product_id!,
        type: "ORDER_CONSUMPTION",
        quantity: -item.quantity, 
        referenceType: "ORDER",
        referenceId: id,
      })
    );
    await Promise.all(inventoryPromises);
  }

  await logActionSafe(client, {
    bakery_id: bakeryId,
    user_id: null, // Note: To get current user, we'd need to fetch auth context or pass it down
    action: "STATUS_CHANGE",
    entity_type: "orders",
    entity_id: id,
    previous_data: existingOrder as unknown as Record<string, any>,
    new_data: updatedOrder as unknown as Record<string, any>,
  });

  if (validated.status && validated.status !== existingOrder.status) {
    await createJob(client, {
      type: "SEND_PUSH_NOTIFICATION",
      payload: {
        token: "mock-token", 
        payload: {
          title: "Order Status Updated",
          body: `Order \${updatedOrder.order_number} is now \${validated.status}`
        }
      }
    });
  }

  const result = await findOrderById(client, bakeryId, id);
  return mapToOrderModel(result.order, result.items, result.adjustments);
}
