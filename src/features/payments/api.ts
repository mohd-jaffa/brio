import { type SupabaseClient } from "@supabase/supabase-js";
import { type Payment, type CreatePaymentDTO } from "./types";
import { InternalServerError, NotFoundError, ConflictError } from "@/shared/errors/app-error";
import { type CreatePaymentInput, createPaymentSchema } from "@/lib/validation";
import { logActionSafe } from "@/features/audit/api";
import { createJob } from "@/features/workers/api";
import { findOrderById, updateOrder } from "@/features/orders/api";

export async function createPaymentRecord(client: SupabaseClient, bakeryId: string, data: CreatePaymentDTO): Promise<Payment> {
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

  if (error) {
    throw new InternalServerError("INTERNAL_ERROR", error);
  }

  return payment;
}

export async function findPaymentsByOrderId(client: SupabaseClient, bakeryId: string, orderId: string): Promise<Payment[]> {
  const { data, error } = await client
    .from("payments")
    .select("*")
    .eq("bakery_id", bakeryId)
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new InternalServerError("INTERNAL_ERROR", error);
  }

  return data;
}

export async function processPayment(client: SupabaseClient, bakeryId: string, payload: CreatePaymentInput): Promise<Payment> {
  const validated = createPaymentSchema.parse(payload);

  const orderData = await findOrderById(client, bakeryId, validated.order_id);
  if (!orderData) {
    throw new NotFoundError("RECORD_NOT_FOUND");
  }

  const order = orderData.order;
  const amountPaise = Math.round(validated.amount * 100);

  const existingPayments = await findPaymentsByOrderId(client, bakeryId, validated.order_id);
  const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);

  if (totalPaid + amountPaise > order.total) {
    throw new ConflictError("CONFLICT", "Payment amount exceeds order total");
  }

  const payment = await createPaymentRecord(client, bakeryId, {
    order_id: validated.order_id,
    amount: amountPaise,
    payment_method: validated.payment_method,
    reference: validated.reference,
  });

  const newTotalPaid = totalPaid + amountPaise;
  const newPaymentStatus = newTotalPaid >= order.total ? "PAID" : "PARTIALLY_PAID";

  if (order.payment_status !== newPaymentStatus) {
    await updateOrder(client, bakeryId, order.id, { payment_status: newPaymentStatus });
  }

  await logActionSafe(client, {
    bakery_id: bakeryId,
    user_id: null,
    action: "CREATE",
    entity_type: "payments",
    entity_id: payment.id,
    new_data: payment as unknown as Record<string, any>,
  });

  await createJob(client, {
    type: "SEND_PUSH_NOTIFICATION",
    payload: {
      token: "mock-token", 
      payload: {
        title: "Payment Received",
        body: `Payment of \${validated.amount} received for order \${order.order_number}`
      }
    }
  });

  return payment;
}
