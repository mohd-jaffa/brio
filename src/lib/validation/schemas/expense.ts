import { z } from "zod";

import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/constants/statuses";
import { VALIDATION_MESSAGES } from "@/constants/messages";

import { optionalUrl, paiseAmount, paiseText, requiredText } from "../primitives";

export const expenseCategorySchema = z.enum(EXPENSE_CATEGORIES);
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);

/** An expense as the form holds it. Amounts are whole paise (AGENTS.md §13). */
export const createExpenseSchema = z.object({
  category: expenseCategorySchema,
  description: requiredText("Description", 500),
  amount: paiseAmount("Amount"),
  expenseDate: z.string().date(VALIDATION_MESSAGES.invalid),
  paymentMethod: paymentMethodSchema,
  receiptUrl: optionalUrl("Receipt link"),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type CreateExpenseInput = z.input<typeof createExpenseSchema>;
export type CreateExpensePayload = z.output<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.input<typeof updateExpenseSchema>;
export type UpdateExpensePayload = z.output<typeof updateExpenseSchema>;

/** An expense as its form holds it: the amount is typed in rupees, stored as paise. */
export const expenseFormSchema = z.object({
  category: expenseCategorySchema,
  description: createExpenseSchema.shape.description,
  amount: paiseText("Amount"),
  expenseDate: createExpenseSchema.shape.expenseDate,
  paymentMethod: paymentMethodSchema,
});

export type ExpenseFormValues = z.input<typeof expenseFormSchema>;
export type ExpenseFormPayload = z.output<typeof expenseFormSchema>;
