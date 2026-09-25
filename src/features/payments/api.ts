import type { Tenant } from "@/lib/supabase/tenant";
import { type Payment, type CreatePaymentDTO } from "./types";
import { type CreatePaymentPayload } from "@/lib/validation";
import { logActionSafe } from "@/lib/audit/auditLog";
import { JOB_TYPES } from "@/constants/jobs";
import { createJob } from "@/lib/jobs/queue";
import { findOrderById, updateOrder } from "@/features/orders/api";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { conflictError } from "@/lib/errors";
import { sumPaise } from "@/lib/money";

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

export async function processPayment(tenant: Tenant, input: CreatePaymentPayload): Promise<Payment> {
  const orderData = await findOrderById(tenant, input.order_id);
  const order = orderData.order;
  // Already whole paise: the form converted the rupees a baker typed, and the
  // schema carries paise (AGENTS.md §13). Converting again stored 100× the amount.
  const amountPaise = input.amount;

  const existingPayments = await findPaymentsByOrderId(tenant, input.order_id);
  const totalPaid = sumPaise(existingPayments.map((payment) => payment.amount));

  if (totalPaid + amountPaise > order.total) {
    throw conflictError("CONFLICT", { reason: "payment_exceeds_order_total" });
  }

  const payment = await createPaymentRecord(tenant, {
    order_id: input.order_id,
    amount: amountPaise,
    payment_method: input.payment_method,
    reference: input.reference,
  });

  const newTotalPaid = totalPaid + amountPaise;
  const newPaymentStatus = newTotalPaid >= order.total ? "PAID" : "PARTIALLY_PAID";

  if (order.payment_status !== newPaymentStatus) {
    await updateOrder(tenant, order.id, { payment_status: newPaymentStatus });
  }

  await logActionSafe(tenant, {
    action: "CREATE",
    entity_type: "payments",
    entity_id: payment.id,
    new_data: payment as unknown as Record<string, unknown>,
  });

  await createJob(tenant.supabase, {
    type: JOB_TYPES.pushNotification,
    // No device token: the token registry comes with push (R8.6), and until it
    // does the worker completes the job as having no device to reach.
    payload: {
      payload: {
        title: "Payment Received",
        body: `Payment of ${input.amount} received for order ${order.order_number}`
      }
    }
  });

  return payment;
}
