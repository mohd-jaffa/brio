import { z } from "zod";
import { VALIDATION_MESSAGES } from "@/constants/messages";

export const expenseCategorySchema = z.enum([
  'Ingredients',
  'Packaging',
  'Delivery',
  'Equipment',
  'Utilities',
  'Marketing',
  'Rent',
  'Other'
]);

export const paymentMethodSchema = z.enum([
  'CASH',
  'UPI',
  'BANK_TRANSFER',
  'CARD',
  'OTHER'
]);

export const createExpenseSchema = z.object({
  category: expenseCategorySchema,
  description: z.string().min(1, VALIDATION_MESSAGES.required("Description")).max(500),
  amount: z.number().int().positive(VALIDATION_MESSAGES.moreThanZero("Amount")),
  expenseDate: z.string().date(VALIDATION_MESSAGES.invalid),
  paymentMethod: paymentMethodSchema,
  receiptUrl: z.string().url().max(1000).optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
