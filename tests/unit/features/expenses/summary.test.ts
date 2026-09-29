import { describe, expect, it } from "vitest";

import { RECENT_EXPENSES } from "@/constants/limits";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/constants/statuses";
import { summariseExpenses, within } from "@/features/expenses/summary";
import type { Expense } from "@/features/expenses/types";

const anExpense = (id: string, expenseDate: string, amount: number, changes: Partial<Expense> = {}): Expense => ({
  id,
  category: "Ingredients",
  description: `Expense ${id}`,
  amount,
  expenseDate,
  paymentMethod: "CASH",
  createdAt: `${expenseDate}T05:00:00Z`,
  updatedAt: `${expenseDate}T05:00:00Z`,
  ...changes,
});

const period = { from: "2026-09-20", to: "2026-09-26" };
const previous = { from: "2026-09-13", to: "2026-09-19" };
const categories = [...DEFAULT_EXPENSE_CATEGORIES, "Flowers"];

describe("within", () => {
  it("keeps the expenses dated in the period, both ends included", () => {
    const expenses = [
      anExpense("a", "2026-09-19", 1),
      anExpense("b", "2026-09-20", 1),
      anExpense("c", "2026-09-26", 1),
      anExpense("d", "2026-09-27", 1),
    ];
    expect(within(expenses, period).map((expense) => expense.id)).toEqual(["b", "c"]);
  });
});

describe("summariseExpenses", () => {
  it("totals the period and the one before, and averages them per day", () => {
    const summary = summariseExpenses(
      [anExpense("a", "2026-09-21", 7000), anExpense("b", "2026-09-26", 700), anExpense("c", "2026-09-15", 1400)],
      period,
      previous,
      "DAY",
      categories,
    );
    expect(summary.total).toEqual({ value: 7700, previous: 1400 });
    expect(summary.dailyAverage).toEqual({ value: 1100, previous: 200 });
    expect(summary.trend).toHaveLength(7);
    expect(summary.trend[1]).toEqual({ start: "2026-09-21", value: 7000 });
    expect(summary.trend[6]).toEqual({ start: "2026-09-26", value: 700 });
  });

  it("keeps every category, the business's own too, the largest first and the rest in their own order", () => {
    const summary = summariseExpenses(
      [
        anExpense("a", "2026-09-21", 500, { category: "Packaging" }),
        anExpense("b", "2026-09-22", 900, { category: "Rent" }),
        anExpense("c", "2026-09-23", 400, { category: "Packaging" }),
        anExpense("d", "2026-09-24", 300, { category: "Flowers" }),
      ],
      period,
      previous,
      "DAY",
      categories,
    );
    expect(summary.byCategory).toHaveLength(9);
    expect(summary.byCategory.slice(0, 4)).toEqual([
      { category: "Packaging", total: 900, count: 2 },
      { category: "Rent", total: 900, count: 1 },
      { category: "Flowers", total: 300, count: 1 },
      { category: "Ingredients", total: 0, count: 0 },
    ]);
  });

  it("lists the latest few, newest day first and the later record first within a day", () => {
    const expenses = [
      anExpense("old", "2026-09-20", 1),
      anExpense("early", "2026-09-25", 1, { createdAt: "2026-09-25T04:00:00Z" }),
      anExpense("late", "2026-09-25", 1, { createdAt: "2026-09-25T09:00:00Z" }),
      ...Array.from({ length: RECENT_EXPENSES }, (_, index) => anExpense(`n${index}`, "2026-09-24", 1)),
      anExpense("before", "2026-09-18", 1),
    ];
    const summary = summariseExpenses(expenses, period, previous, "WEEK", categories);
    expect(summary.recent).toHaveLength(RECENT_EXPENSES);
    expect(summary.recent.slice(0, 2).map((expense) => expense.id)).toEqual(["late", "early"]);
    expect(summary.trend).toEqual([{ start: "2026-09-20", value: expenses.length - 1 }]);
  });
});
