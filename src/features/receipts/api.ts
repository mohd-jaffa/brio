import type { Tenant } from "@/lib/supabase/tenant";

import { getBusiness } from "@/features/business/api";
import { getCustomerById } from "@/features/customers/api";
import { getOrderById } from "@/features/orders/queries";
import { findPaymentsByOrderId } from "@/features/payments/api";
import { getServerEnv } from "@/lib/env/server";

import { orderBill } from "./bill";
import type { Bill } from "./types";

/**
 * A placed order's bill, built when it is asked for and stored nowhere
 * (AGENTS.md §15): the order with its payments, its customer — none for a
 * Guest — and the business it is from (§133.2 B4). Every read goes through the
 * caller's client, so RLS keeps it to their own business.
 */
export async function getBill(tenant: Tenant, orderId: string): Promise<Bill> {
  const order = await getOrderById(tenant, orderId);
  const [payments, customer, business] = await Promise.all([
    findPaymentsByOrderId(tenant, orderId),
    order.customerId ? getCustomerById(tenant, order.customerId) : undefined,
    getBusiness(tenant),
  ]);
  return orderBill({ order, payments, customer, business, appUrl: getServerEnv().NEXT_PUBLIC_APP_URL });
}
