import type { Tenant } from "@/lib/supabase/tenant";
import { type Payment, type CreatePaymentDTO } from "./types";
import { type CreatePaymentPayload } from "@/lib/validation";
import { logActionSafe } from "@/lib/audit/auditLog";
import { JOB_TYPES } from "@/constants/jobs";
import { createJob } from "@/lib/jobs/queue";
import { logger } from "@/lib/logger";
import { findOrderById } from "@/features/orders/api";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { conflictError } from "@/lib/errors";

export async function createPaymentRecord(tenant: Tenant, data: CreatePaymentDTO): Promise<Payment> {
  const { supabase: client, bakeryId } = tenant;
  const { data: payment, error } = await client
    .from("payments")
    .insert({
      bakery_id: bakeryId,
      order_id: data.order_id,
      amount: data.amount,
      payment_method: data.payment_method,
      reference: data.reference,
      idempotency_key: data.idempotency_key,
    })
    .select()
    .single();

  if (error) throw fromPostgrestError(error);
  return payment;
}

export async function findPaymentsByOrderId(tenant: Tenant, orderId: string): Promise<Payment[]> {
  const { supabase: client, bakeryId } = tenant;
  const { data, error } = await client
    .from("payments")
    .select("*")
    .eq("bakery_id", bakeryId)
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) throw fromPostgrestError(error);
  return data;
}

/** The payment this business already recorded under a key, if any. */
async function findPaymentByKey(tenant: Tenant, idempotencyKey: string): Promise<Payment | null> {
  const { supabase: client, bakeryId } = tenant;
  const { data, error } = await client
    .from("payments")
    .select("*")
    .eq("bakery_id", bakeryId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw fromPostgrestError(error);
  return data;
}

/**
 * Records a payment against an order (plan §139.11.9). The database does the
 * rest in the same statement (0015_create_order.sql): a payment that would
 * take the order past its total is refused, with the order locked so two at
 * once are counted in turn, and the order's payment status is derived from its
 * payments — never set by hand (BUG-06).
 *
 * `idempotencyKey` makes a repeat harmless: the same key returns the payment
 * the first request recorded, and records nothing more (§133.3 C2).
 */
export async function processPayment(
  tenant: Tenant,
  input: CreatePaymentPayload,
  idempotencyKey: string,
): Promise<Payment> {
  // Read through this business's records: another's order is not found.
  const { order } = await findOrderById(tenant, input.order_id);

  const repeat = await findPaymentByKey(tenant, idempotencyKey);
  if (repeat) return sameOrder(repeat, order.id);

  let payment: Payment;
  try {
    payment = await createPaymentRecord(tenant, {
      order_id: order.id,
      amount: input.amount,
      payment_method: input.payment_method,
      reference: input.reference,
      idempotency_key: idempotencyKey,
    });
  } catch (error) {
    // The same key sent twice at once: the other request recorded it first.
    const recorded = await findPaymentByKey(tenant, idempotencyKey);
    if (recorded) return sameOrder(recorded, order.id);
    throw error;
  }

  await logActionSafe(tenant, {
    action: "CREATE",
    entity_type: "payments",
    entity_id: payment.id,
    new_data: payment as unknown as Record<string, unknown>,
  });

  await notifyPayment(tenant, order.order_number, payment.amount);
  return payment;
}

/**
 * Queues "₹500 received for ORD-1028." as facts; the worker writes the words
 * (BUG-26). The payment is recorded already, so a queue that cannot take the
 * notification is logged, never reported as a failed payment.
 */
async function notifyPayment(tenant: Tenant, orderNumber: string, amount: number) {
  try {
    await createJob(tenant.supabase, {
      type: JOB_TYPES.pushNotification,
      payload: { bakeryId: tenant.bakeryId, message: { kind: "PAYMENT_RECEIVED", orderNumber, amount } },
    });
  } catch (error) {
    logger.error("Could not queue the payment notification", {
      bakeryId: tenant.bakeryId,
      orderNumber,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

/** A key names one payment on one order; reused for another order, it is refused. */
function sameOrder(payment: Payment, orderId: string): Payment {
  if (payment.order_id !== orderId) throw conflictError("CONFLICT", { reason: "idempotency_key_reused" });
  return payment;
}
