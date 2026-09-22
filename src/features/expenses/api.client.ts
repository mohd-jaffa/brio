import { apiRoutes } from "@/lib/query/keys";
import { deleteJson, getJson, patchJson, postJson } from "@/lib/api/client";
import type { CreateExpenseInput, UpdateExpenseInput } from "@/lib/validation";

import type { Expense } from "./types";

export const ExpensesClient = {
  list: () => getJson<Expense[]>(apiRoutes.expenses.list),
  createExpense: (payload: CreateExpenseInput) => postJson<Expense>(apiRoutes.expenses.list, payload),
  updateExpense: (id: string, payload: UpdateExpenseInput) =>
    patchJson<Expense>(apiRoutes.expenses.detail(id), payload),
  deleteExpense: (id: string) => deleteJson<{ deleted: true }>(apiRoutes.expenses.detail(id)),
};
