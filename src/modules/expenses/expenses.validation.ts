import { z } from "zod";

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
  description: z.string().min(1, "Description is required").max(500),
  amount: z.number().int().positive("Amount must be a positive integer in paise"),
  expenseDate: z.string().date("Must be a valid date (YYYY-MM-DD)"),
  paymentMethod: paymentMethodSchema,
  receiptUrl: z.string().url().max(1000).optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
