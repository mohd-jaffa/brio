import type { Tenant } from "@/lib/supabase/tenant";

import { logActionSafe } from "@/lib/audit/auditLog";
import { businessRuleError } from "@/lib/errors";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import type { UpdateOrderPayload } from "@/lib/validation";

import { findOrderById } from "./api";
import { isFinal } from "./lifecycle";
import { priceOrder, type PricedLine } from "./pricing";
import { getOrderById } from "./queries";
import type { Order, OrderRow } from "./types";
import type { OrderTotals } from "./totals";

/**
 * Changes an open order (plan §139.11.13): its lines — more of something, a
 * new product or custom item, one taken off — who it is for, how and when it
 * is handed over, its discounts and charges, and its notes.
 *
 * The server prices it as it prices a new order (./pricing), except that a
 * line already on the order keeps the name and price it was ordered at.
 * `update_order` then stores it in one transaction (0025_edit_orders.sql):
 * the reservation follows each product's change in quantity, checked against
 * stock as a new order is (§133.3 C4); the total may not come to less than
 * has been paid; the payment status is derived again. A delivered or
 * cancelled order is refused: stock has followed it.
 *
 * Sent twice, it changes nothing the second time: it says what the order
 * should be, not what to add to it.
 */
export async function updateOrder(tenant: Tenant, id: string, input: UpdateOrderPayload): Promise<Order> {
  const before = await findOrderById(tenant, id);
  if (isFinal(before.order.status)) throw businessRuleError("ORDER_NOT_EDITABLE", { status: before.order.status });

  const kept = new Map(before.items.map((item) => [item.id, item]));
  const { customer, lines, totals } = await priceOrder(tenant, input, kept);

  const { error } = await tenant.supabase
    .rpc("update_order", {
      p_order_id: id,
      p_order: toChanges(input, customer.kind === "CUSTOMER" ? customer.id : null, lines, totals),
    })
    .single<OrderRow>();
  if (error) throw fromPostgrestError(error);

  // After the transaction, by the server, as the user who changed it (R2.10):
  // the order with its lines and adjustments, before and after.
  const after = await findOrderById(tenant, id);
  await logActionSafe(tenant, {
    action: "UPDATE",
    entity_type: "orders",
    entity_id: id,
    previous_data: before as unknown as Record<string, unknown>,
    new_data: after as unknown as Record<string, unknown>,
  });

  return getOrderById(tenant, id);
}

/** The order as `update_order` takes it: what the server priced, never what was sent. */
function toChanges(input: UpdateOrderPayload, customerId: string | null, lines: readonly PricedLine[], totals: OrderTotals) {
  return {
    customer_id: customerId,
    delivery_type: input.delivery.type,
    delivery_date: input.delivery.date,
    delivery_address: input.delivery.address,
    delivery_google_maps_link: input.delivery.googleMapsLink,
    notes: input.notes,
    subtotal: totals.subtotal,
    discount: totals.discount,
    delivery_charge: totals.deliveryCharge,
    tax: totals.tax,
    total: totals.total,
    items: lines.map((line) => ({
      item_id: line.itemId ?? null,
      product_id: line.productId,
      product_name: line.name,
      unit_price: line.unitPrice,
      quantity: line.quantity,
      subtotal: line.subtotal,
      notes: line.notes,
    })),
    adjustments: input.adjustments.map(({ type, name, amount }) => ({ type, name, amount })),
  };
}
