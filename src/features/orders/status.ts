import type { Tenant } from "@/lib/supabase/tenant";

import { logActionSafe } from "@/lib/audit/auditLog";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import type { UpdateOrderStatusPayload } from "@/lib/validation";

import { findOrderById } from "./api";
import { getOrderById } from "./queries";
import type { Order, OrderRow } from "./types";

/**
 * Moves an order along (AGENTS.md §12, plan §139.11.8). `change_order_status`
 * does it in one transaction (0016_change_order_status.sql; §133.3 C6): it
 * refuses a move the transition table does not allow (BUG-05), or one from a
 * status the order has already left — a double tap, or another device — so
 * stock is never posted twice; posts the stock that follows (C5, BUG-04); and
 * queues the notification with the move, so neither happens without the other.
 *
 * The payment status is not set here, or anywhere by hand: the payments decide
 * it (BUG-06, §139.11.9).
 */
export async function updateOrderStatus(
  tenant: Tenant,
  id: string,
  input: UpdateOrderStatusPayload,
): Promise<Order> {
  const { order: before } = await findOrderById(tenant, id);

  if (input.status !== before.status) {
    const { data, error } = await tenant.supabase
      .rpc("change_order_status", { p_order_id: id, p_from: before.status, p_to: input.status })
      .single<OrderRow>();
    if (error) throw fromPostgrestError(error);

    // After the transaction, by the server, as the user who moved it (R2.10).
    await logActionSafe(tenant, {
      action: "STATUS_CHANGE",
      entity_type: "orders",
      entity_id: id,
      previous_data: before as unknown as Record<string, unknown>,
      new_data: data as unknown as Record<string, unknown>,
    });
  }

  return getOrderById(tenant, id);
}
