import type { Tenant } from "@/lib/supabase/tenant";

import { findPaymentsByOrderId } from "@/features/payments/api";
import { logActionSafe } from "@/lib/audit/auditLog";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import type { CreateOrderPayload } from "@/lib/validation";

import { findOrderById } from "./api";
import { priceDraft, type PricedDraft } from "./pricing";
import { getOrderById } from "./queries";
import type { Order } from "./types";

/**
 * Places an order (AGENTS.md §12, plan §114). The server prices the draft
 * (./pricing), and `create_order` stores it in one transaction — the order
 * with its number, its lines and adjustments, the stock it reserves, and the
 * payment taken with it — or stores nothing (0015_create_order.sql; §133.3 C1,
 * BUG-09). Stock is checked there, after the products are locked, so two
 * orders cannot both take the last of something (C4).
 *
 * `idempotencyKey` makes a repeat harmless: the same key returns the order the
 * first request made, and nothing is created, audited or reserved again (C2).
 */
export async function createOrder(
  tenant: Tenant,
  input: CreateOrderPayload,
  idempotencyKey: string,
): Promise<Order> {
  const draft = await priceDraft(tenant, input);

  const { data, error } = await tenant.supabase
    .rpc("create_order", { p_order: toOrderPayload(input, draft), p_idempotency_key: idempotencyKey })
    .single<{ order_id: string; created: boolean }>();
  if (error) throw fromPostgrestError(error);

  if (data.created) await auditCreation(tenant, data.order_id);
  return getOrderById(tenant, data.order_id);
}

/** The order as `create_order` takes it: what the server priced, never what was sent. */
function toOrderPayload(input: CreateOrderPayload, { customer, lines, totals, payment }: PricedDraft) {
  return {
    customer_id: customer.kind === "CUSTOMER" ? customer.id : null,
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
      product_id: line.productId,
      product_name: line.name,
      unit_price: line.unitPrice,
      quantity: line.quantity,
      subtotal: line.subtotal,
      notes: line.notes,
    })),
    adjustments: input.adjustments.map(({ type, name, amount }) => ({ type, name, amount })),
    payment:
      payment.status !== "UNPAID" && payment.amount > 0
        ? { amount: payment.amount, method: payment.method, reference: payment.reference }
        : null,
  };
}

/**
 * The new order, and the payment taken with it, in the audit trail as the user
 * who placed it (AGENTS.md §11). Written after the transaction, by the server
 * (R2.10); a failure is logged and never undoes the order.
 */
async function auditCreation(tenant: Tenant, orderId: string) {
  const [{ order }, payments] = await Promise.all([findOrderById(tenant, orderId), findPaymentsByOrderId(tenant, orderId)]);
  await logActionSafe(tenant, {
    action: "CREATE",
    entity_type: "orders",
    entity_id: orderId,
    new_data: order as unknown as Record<string, unknown>,
  });
  for (const payment of payments) {
    await logActionSafe(tenant, {
      action: "CREATE",
      entity_type: "payments",
      entity_id: payment.id,
      new_data: payment as unknown as Record<string, unknown>,
    });
  }
}
