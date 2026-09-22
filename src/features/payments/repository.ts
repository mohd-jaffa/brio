import { type SupabaseClient } from "@supabase/supabase-js";
import { type Payment, type CreatePaymentDTO } from "./types";
import { InternalServerError, NotFoundError } from "@/shared/errors/app-error";
import { ERROR_MESSAGES } from "@/constants/messages";

export class PaymentsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(bakeryId: string, data: CreatePaymentDTO): Promise<Payment> {
    const { data: payment, error } = await this.client
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

  async findByOrderId(bakeryId: string, orderId: string): Promise<Payment[]> {
    const { data, error } = await this.client
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
}
