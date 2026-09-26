import type { IllustrationKey } from "@/constants/illustrations";
import type { ExpenseCategory, PaymentMethod } from "@/constants/statuses";
import type { Interval, Period } from "@/lib/dates/range";

export type { ExpenseCategory, PaymentMethod };

export interface ExpenseRow {
  id: string;
  bakery_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: PaymentMethod;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  /** Whole paise — never a float (AGENTS.md §13). */
  amount: number;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * An expense category (plan §139.11.10): one of the eight defaults or one the
 * business made (`custom`), with its picture — a key from the library, or
 * null for `default-expense`.
 */
export interface ExpenseCategoryItem {
  category: ExpenseCategory;
  iconKey: IllustrationKey | null;
  custom: boolean;
}

/** A figure for the period, with the period before's for its delta. */
export interface ExpenseFigure {
  value: number;
  previous: number;
}

/**
 * Expenses for a period (`GET /api/expenses/summary`, plan §139.11.11): the
 * total and the daily average, each with the period before's; every
 * category's total and count — the defaults and the business's own — the
 * largest first; the trend by day or week; and the most recent expenses.
 */
export interface ExpenseSummary {
  period: Period;
  previous: Period;
  interval: Interval;
  total: ExpenseFigure;
  dailyAverage: ExpenseFigure;
  byCategory: { category: ExpenseCategory; total: number; count: number }[];
  trend: { start: string; value: number }[];
  recent: Expense[];
}
