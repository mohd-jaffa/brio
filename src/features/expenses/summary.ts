import { RECENT_EXPENSES } from "@/constants/limits";
import { daysFrom } from "@/lib/dates/calendar";
import { bucketIndex, bucketStarts, type Interval, type Period } from "@/lib/dates/range";
import { sumPaise } from "@/lib/money";

import type { Expense, ExpenseSummary } from "./types";

/** The expenses dated within a period, both ends included; dates are days, so they compare as text. */
export function within(expenses: readonly Expense[], period: Period): Expense[] {
  return expenses.filter((expense) => expense.expenseDate >= period.from && expense.expenseDate <= period.to);
}

const total = (expenses: readonly Expense[]) => sumPaise(expenses.map((expense) => expense.amount));

/** What a day cost on average over a period, in whole paise. */
function perDay(expenses: readonly Expense[], period: Period): number {
  return Math.round(total(expenses) / daysFrom(period.from, period.to).length);
}

/**
 * Expenses summed for a period and the one before (plan §139.11.11): the
 * total and the daily average; every one of the business's `categories` with
 * its total and count, the largest first and each always there, so none
 * drops out of the Categories tab; the trend by day or week; and the most
 * recent, newest first.
 */
export function summariseExpenses(
  expenses: readonly Expense[],
  period: Period,
  previous: Period,
  interval: Interval,
  categories: readonly string[],
): ExpenseSummary {
  const current = within(expenses, period);
  const before = within(expenses, previous);

  const starts = bucketStarts(period, interval);
  const values = starts.map(() => 0);
  for (const expense of current) values[bucketIndex(period, interval, expense.expenseDate)] += expense.amount;

  const byCategory = categories.map((category, order) => {
    const spent = current.filter((expense) => expense.category === category);
    return { category, total: total(spent), count: spent.length, order };
  })
    .sort((a, b) => b.total - a.total || a.order - b.order)
    .map(({ category, total: spent, count }) => ({ category, total: spent, count }));

  return {
    period,
    previous,
    interval,
    total: { value: total(current), previous: total(before) },
    dailyAverage: { value: perDay(current, period), previous: perDay(before, previous) },
    byCategory,
    trend: starts.map((start, index) => ({ start, value: values[index] })),
    recent: [...current]
      .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, RECENT_EXPENSES),
  };
}
