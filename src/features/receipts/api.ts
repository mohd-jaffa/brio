import { type SupabaseClient } from "@supabase/supabase-js";
import { type ReceiptData } from "./types";
import { getOrderById } from "@/features/orders/queries";
import { findPaymentsByOrderId } from "@/features/payments/api";

export async function generateReceiptData(client: SupabaseClient, bakeryId: string, orderId: string): Promise<ReceiptData> {
  const order = await getOrderById(client, bakeryId, orderId);
  const payments = await findPaymentsByOrderId(client, bakeryId, orderId);

  return {
    order,
    items: order.items || [],
    payments,
    bakeryName: "Ovenly Bakery", 
    generatedAt: new Date().toISOString(),
  };
}
