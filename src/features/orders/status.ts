import type { SupabaseClient } from "@supabase/supabase-js";

import { logInventoryTransaction } from "@/features/inventory/api";
import { logActionSafe } from "@/lib/audit/auditLog";
import { createJob } from "@/lib/jobs/queue";
import { definedOnly } from "@/lib/supabase/columns";
import type { UpdateOrderStatusPayload } from "@/lib/validation";

import { findOrderById, updateOrder } from "./api";
import { mapToOrderModel } from "./mappers";
import type { Order, OrderRow } from "./types";

/**
 * Moves an order along (AGENTS.md §12). Three things follow from the change
 * and all of them happen here, so no caller has to remember them: stock is
 * consumed the first time an order is delivered, the change is audited with
 * the row before and after, and a notification is enqueued rather than sent
 * inline (AGENTS.md §17).
 */
export async function updateOrderStatus(
  client: SupabaseClient,
  bakeryId: string,
  id: string,
  input: UpdateOrderStatusPayload,
): Promise<Order> {
  const patch = definedOnly<Partial<Pick<OrderRow, "status" | "payment_status">>>({
    status: input.status,
    payment_status: input.paymentStatus,
  });

  const { order: before, items } = await findOrderById(client, bakeryId, id);
  const after = await updateOrder(client, bakeryId, id, patch);

  // Only on the first delivery: the reservation was posted when the order was
  // created, and the ledger must not be double-counted.
  if (input.status === "DELIVERED" && before.status !== "DELIVERED") {
    await Promise.all(
      items.map((item) =>
        logInventoryTransaction(client, bakeryId, {
          productId: item.product_id!,
          type: "ORDER_CONSUMPTION",
          quantity: -item.quantity,
          referenceType: "ORDER",
          referenceId: id,
        }),
      ),
    );
  }

  await logActionSafe(client, {
    bakery_id: bakeryId,
    user_id: null,
    action: "STATUS_CHANGE",
    entity_type: "orders",
    entity_id: id,
    previous_data: before as unknown as Record<string, unknown>,
    new_data: after as unknown as Record<string, unknown>,
  });

  if (input.status && input.status !== before.status) {
    await createJob(client, {
      type: "SEND_PUSH_NOTIFICATION",
      payload: {
        payload: {
          title: "Order Status Updated",
          body: `Order ${after.order_number} is now ${input.status}`,
        },
      },
    });
  }

  const current = await findOrderById(client, bakeryId, id);
  return mapToOrderModel(current.order, current.items, current.adjustments);
}
