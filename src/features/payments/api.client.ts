import { apiRoutes } from "@/lib/query/keys";
import { getJson, postJson } from "@/lib/api/client";
import type { CreatePaymentInput } from "@/lib/validation";

import type { Payment } from "./types";

export const PaymentsClient = {
  getPayments: (orderId: string) => getJson<Payment[]>(apiRoutes.orders.payments(orderId)),
  /** The order is named by the path, so it is not part of the body. */
  createPayment: (orderId: string, payload: Omit<CreatePaymentInput, "order_id">) =>
    postJson<Payment>(apiRoutes.orders.payments(orderId), payload),
};
