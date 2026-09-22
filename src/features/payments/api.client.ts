import { fetcher } from "@/shared/api/client";
import { type CreatePaymentPayload } from "@/lib/validation";
import { type Payment } from "./types";

export const PaymentsClient = {
  createPayment: async (orderId: string, payload: Omit<CreatePaymentPayload, "order_id">): Promise<Payment> => {
    return fetcher(`/api/orders/${orderId}/payments`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getPayments: async (orderId: string): Promise<Payment[]> => {
    return fetcher(`/api/orders/${orderId}/payments`);
  },
};
