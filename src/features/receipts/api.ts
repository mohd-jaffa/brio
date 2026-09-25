import type { Tenant } from "@/lib/supabase/tenant";
import { type ReceiptData } from "./types";
import { getOrderById } from "@/features/orders/queries";
import { findPaymentsByOrderId } from "@/features/payments/api";

export async function generateReceiptData(tenant: Tenant, orderId: string): Promise<ReceiptData> {
  const order = await getOrderById(tenant, orderId);
  const payments = await findPaymentsByOrderId(tenant, orderId);

  return {
    order,
    items: order.items || [],
    payments,
    bakeryName: "Ovenly Bakery", 
    generatedAt: new Date().toISOString(),
  };
}
