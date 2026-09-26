import { z } from "zod";

import { MAX_EXPENSE_CATEGORY_NAME } from "@/constants/limits";
import { VALIDATION_MESSAGES } from "@/constants/messages";
import { isDefaultExpenseCategory, PAYMENT_METHODS } from "@/constants/statuses";

import { optionalIllustration, optionalUrl, paiseAmount, paiseText, requiredLine } from "../primitives";
import { cursorParam } from "./list";
import { customRange, rangeFields } from "./range";

/**
 * An expense's category, by name: a default or one the business made. Which
 * names a business has is the database's check (`0020_expense_categories`),
 * which refuses any other as EXPENSE_CATEGORY_UNKNOWN.
 */
export const expenseCategorySchema = requiredLine("Category", { max: MAX_EXPENSE_CATEGORY_NAME });
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);

/** An expense as the form holds it. Amounts are whole paise (AGENTS.md §13). */
export const createExpenseSchema = z.object({
  category: expenseCategorySchema,
  description: requiredLine("Description", { max: 500 }),
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

/**
 * `GET /api/expenses` (plan §139.10): the Transactions tab — the period the
 * screen reads over, one category or all, and where the page starts.
 */
export const expenseListQuerySchema = rangeFields
  .extend({ category: expenseCategorySchema.optional(), cursor: cursorParam })
  .superRefine(customRange);

/**
 * A category of the business's own, beside the eight (the user, 2026-09-26):
 * its name — never one of the eight's — and its picture, a library key or
 * null for the default (§139.11.10). `POST /api/expense-categories` makes
 * one; `PATCH /api/expense-categories/{category}` renames it or changes its
 * picture. The eight themselves are never changed.
 */
export const expenseCategoryFormSchema = z.object({
  name: requiredLine("Category name", { max: MAX_EXPENSE_CATEGORY_NAME }).refine(
    (name) => !isDefaultExpenseCategory(name),
    { error: VALIDATION_MESSAGES.defaultCategory },
  ),
  iconKey: optionalIllustration("picture").transform((key) => key ?? null),
});

export type ExpenseListQuery = z.output<typeof expenseListQuerySchema>;
export type ExpenseCategoryFormInput = z.input<typeof expenseCategoryFormSchema>;
export type ExpenseCategoryFormPayload = z.output<typeof expenseCategoryFormSchema>;
