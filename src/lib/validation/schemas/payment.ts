import { z } from 'zod';
import { VALIDATION_MESSAGES } from '@/constants/messages';
import { amountText } from '../primitives';

export const createPaymentSchema = z.object({
  order_id: z.string().uuid(VALIDATION_MESSAGES.invalid),
  amount: amountText('Amount'), // will be received as a string like "100.50"
  payment_method: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER']),
  reference: z.string().optional().nullable(),
});

export type CreatePaymentPayload = z.output<typeof createPaymentSchema>;
export type CreatePaymentInput = z.input<typeof createPaymentSchema>;
