import type { IllustrationKey } from "@/constants/illustrations";
import { deleteJson, patchJson, postJson } from "@/lib/api/client";
import { apiRoutes } from "@/lib/query/keys";
import type { CreateExpenseInput, ExpenseCategoryFormInput, UpdateExpenseInput } from "@/lib/validation";

import type { Expense, ExpenseCategory, ExpenseCategoryItem } from "./types";

export const ExpensesClient = {
  /** A category of the business's own, beside the eight (the user, 2026-09-26). */
  createCategory: (payload: ExpenseCategoryFormInput) =>
    postJson<ExpenseCategoryItem>(apiRoutes.expenseCategories.list, payload),
  /** One of the business's own renamed, or its picture changed; the eight never change (plan §139.11.10). */
  updateCategory: (category: ExpenseCategory, payload: ExpenseCategoryFormInput) =>
    patchJson<ExpenseCategoryItem>(apiRoutes.expenseCategories.detail(category), payload),
  /** Only a category of the business's own, and only while no expense is filed under it. */
  deleteCategory: (category: ExpenseCategory) =>
    deleteJson<{ deleted: true }>(apiRoutes.expenseCategories.detail(category)),
  /** One of the business's own: its picture alone — the name it has, and the new key (null for the default). */
  setCategoryIcon: (category: ExpenseCategory, iconKey: IllustrationKey | null) =>
    patchJson<ExpenseCategoryItem>(apiRoutes.expenseCategories.detail(category), { name: category, iconKey }),
  createExpense: (payload: CreateExpenseInput) => postJson<Expense>(apiRoutes.expenses.list, payload),
  updateExpense: (id: string, payload: UpdateExpenseInput) =>
    patchJson<Expense>(apiRoutes.expenses.detail(id), payload),
  deleteExpense: (id: string) => deleteJson<{ deleted: true }>(apiRoutes.expenses.detail(id)),
};
