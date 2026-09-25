import type { Tenant } from "@/lib/supabase/tenant";

import { JOB_TYPES } from "@/constants/jobs";
import { logInventoryTransaction } from "@/features/inventory/api";
import { logActionSafe } from "@/lib/audit/auditLog";
import { businessRuleError } from "@/lib/errors";
import { createJob } from "@/lib/jobs/queue";
import type { UpdateOrderStatusPayload } from "@/lib/validation";

import { findOrderById, findPaidByOrder, moveOrderStatus, updateOrder } from "./api";
import { canMoveTo, stockMovements } from "./lifecycle";
import { mapToOrderModel } from "./mappers";
import type { Order, OrderRow } from "./types";

/**
 * Moves an order along (AGENTS.md §12, plan §139.11.8). Everything that follows
 * from the move happens here, so no caller has to remember it:
 *
 * - the move is refused unless the transition table allows it (BUG-05);
 * - it applies only if the order is still where it was read, so a double tap
 *   cannot post stock twice;
 * - stock follows it — delivery turns the reservation into consumption, and
 *   cancelling releases it (§133.3 C5, BUG-04);
 * - it is audited with the row before and after, and a notification is queued
 *   rather than sent inline (AGENTS.md §17).
 *
 * Not yet one transaction: a failure between the move and its ledger lines
 * leaves them apart. That is R3.4 (`change_order_status`, §133.3 C6).
 */
export async function updateOrderStatus(
  tenant: Tenant,
  id: string,
  input: UpdateOrderStatusPayload,
): Promise<Order> {
  const { order: before, items } = await findOrderById(tenant, id);
  let after: OrderRow = before;

  const to = input.status;
  if (to && to !== before.status) {
    if (!canMoveTo(before.status, to, before.delivery_type)) {
      throw businessRuleError("ORDER_STATUS_TRANSITION_INVALID", { from: before.status, to });
    }

    after = await moveOrderStatus(tenant, id, before.status, to);

    for (const movement of stockMovements(to, items)) {
      await logInventoryTransaction(tenant, {
        ...movement,
        referenceType: "ORDER",
        referenceId: id,
      });
    }
  }

  // Setting the payment status by hand goes when payments drive it (R3.12, BUG-06).
  if (input.paymentStatus && input.paymentStatus !== after.payment_status) {
    after = await updateOrder(tenant, id, { payment_status: input.paymentStatus });
  }

  await logActionSafe(tenant, {
    action: "STATUS_CHANGE",
    entity_type: "orders",
    entity_id: id,
    previous_data: before as unknown as Record<string, unknown>,
    new_data: after as unknown as Record<string, unknown>,
  });

  if (after.status !== before.status) {
    await createJob(tenant.supabase, {
      type: JOB_TYPES.pushNotification,
      payload: {
        payload: {
          title: "Order Status Updated",
          body: `Order ${after.order_number} is now ${after.status}`,
        },
      },
    });
  }

  const [current, paid] = await Promise.all([
    findOrderById(tenant, id),
    findPaidByOrder(tenant, [id]),
  ]);
  return mapToOrderModel(current.order, current.items, current.adjustments, paid.get(id));
}
