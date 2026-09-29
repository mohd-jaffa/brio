"use client";

import { DEFAULT_EXPENSE_CATEGORIES, type ExpenseCategory } from "@/constants/statuses";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

import type { ExpenseCategoryItem } from "../types";

/**
 * The business's expense categories (plan §139.11.10): the eight defaults
 * and its own, as `names`, and `iconOf` for a category's picture. Until they
 * arrive — or if they cannot be read — the defaults stand in, each on the
 * default picture.
 */
export function useExpenseCategories() {
  const query = useApiQuery<ExpenseCategoryItem[]>(apiRoutes.expenseCategories.list);
  const names: readonly ExpenseCategory[] = query.data?.map((item) => item.category) ?? DEFAULT_EXPENSE_CATEGORIES;
  const iconOf = (category: ExpenseCategory) => query.data?.find((item) => item.category === category)?.iconKey ?? null;
  return { names, iconOf };
}
