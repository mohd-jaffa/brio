import * as z from "zod";

import { VALIDATION_MESSAGES } from "@/constants/messages";
import { PAYMENT_METHODS } from "@/constants/statuses";

import { optionalLine, paiseAmount, paiseText } from "../primitives";

/**
 * A payment collected against an order. Money crosses the wire as whole paise,
 * the way it is stored — the form parses the rupees a baker types
 * (paymentFormSchema) and sends the result (AGENTS.md §13).
 */
export const createPaymentSchema = z.object({
  order_id: z.string().uuid(VALIDATION_MESSAGES.invalid),
  amount: paiseAmount("Amount"),
  payment_method: z.enum(PAYMENT_METHODS),
  reference: optionalLine("Reference", 120),
});

export type CreatePaymentInput = z.input<typeof createPaymentSchema>;
export type CreatePaymentPayload = z.output<typeof createPaymentSchema>;

/** What the collect-payment form holds: the amount as typed, in rupees. */
export const paymentFormSchema = z.object({
  amount: paiseText("Amount"),
  payment_method: z.enum(PAYMENT_METHODS),
  reference: optionalLine("Reference", 120),
});

export type PaymentFormValues = z.input<typeof paymentFormSchema>;
export type PaymentFormPayload = z.output<typeof paymentFormSchema>;
