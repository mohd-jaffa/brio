import { DEFAULT_EXPENSE_CATEGORIES } from "@/constants/statuses";
import type { Expense, ExpenseSummary } from "@/features/expenses/types";

/** One expense, for a component test. */
export function anExpense(changes: Partial<Expense> = {}): Expense {
  return {
    id: "e-1",
    category: "Ingredients",
    description: "Flour and sugar",
    amount: 245000,
    expenseDate: "2026-09-12",
    paymentMethod: "UPI",
    createdAt: "2026-09-12T05:00:00Z",
    updatedAt: "2026-09-12T05:00:00Z",
    ...changes,
  };
}

/** September's first two days of expenses against August's, for a component test. */
export function aSummary(changes: Partial<ExpenseSummary> = {}): ExpenseSummary {
  const spent: Record<string, [number, number]> = {
    Ingredients: [300000, 3],
    Packaging: [100000, 1],
  };
  return {
    period: { from: "2026-09-01", to: "2026-09-02" },
    previous: { from: "2026-08-01", to: "2026-08-02" },
    interval: "DAY",
    total: { value: 400000, previous: 320000 },
    dailyAverage: { value: 200000, previous: 250000 },
    byCategory: [...DEFAULT_EXPENSE_CATEGORIES, "Flowers"].map((category) => ({
      category,
      total: spent[category]?.[0] ?? 0,
      count: spent[category]?.[1] ?? 0,
    })),
    trend: [
      { start: "2026-09-01", value: 150000 },
      { start: "2026-09-02", value: 250000 },
    ],
    recent: [
      anExpense(),
      anExpense({ id: "e-2", category: "Packaging", description: "Cake boxes", amount: 96000, expenseDate: "2026-09-10" }),
    ],
    ...changes,
  };
}
