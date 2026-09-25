import { apiRoutes } from "@/lib/query/keys";
import { getJson, postOnce } from "@/lib/api/client";
import type { CreatePaymentInput } from "@/lib/validation";

import type { Payment } from "./types";

export const PaymentsClient = {
  getPayments: (orderId: string) => getJson<Payment[]>(apiRoutes.orders.payments(orderId)),
  /**
   * The order is named by the path, so it is not part of the body. The same
   * key sent again records nothing more (§133.3 C2).
   */
  createPayment: (orderId: string, payload: Omit<CreatePaymentInput, "order_id">, idempotencyKey: string) =>
    postOnce<Payment>(apiRoutes.orders.payments(orderId), payload, idempotencyKey),
};
