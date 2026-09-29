"use client";

import { ProductTile } from "@/components/ui/product-tile";
import { Row } from "@/components/ui/row";
import { DEFAULT_EXPENSE_ILLUSTRATION } from "@/constants/illustrations";
import { UI_TEXT } from "@/constants/messages";
import type { ExpenseCategory } from "@/constants/statuses";
import { formatPaise } from "@/lib/format/currency";
import { formatDate } from "@/lib/format/date";

import type { Expense } from "../types";

const text = UI_TEXT.expenses;
const CELL = "px-4 py-3";

/** A category's picture (plan §139.11.10): the one the business chose, or the receipt. */
export function CategoryTile({ iconKey, size }: { iconKey: string | null; size?: "sm" | "md" }) {
  return <ProductTile iconKey={iconKey} size={size} fallback={DEFAULT_EXPENSE_ILLUSTRATION} />;
}

/**
 * An expense as a list shows it (plan §139.10): its category's picture, what
 * it was for, the category and the day under it, and what it cost. The whole
 * row opens it to be edited.
 */
export function ExpenseRow({
  expense,
  iconKey,
  onOpen,
}: {
  expense: Expense;
  iconKey: string | null;
  onOpen: (expense: Expense) => void;
}) {
  return (
    <Row
      leading={<CategoryTile iconKey={iconKey} />}
      title={expense.description}
      subtitle={expense.category}
      meta={formatDate(expense.expenseDate)}
      trailing={<span className="tabular-nums">{formatPaise(expense.amount)}</span>}
      onClick={() => onOpen(expense)}
    />
  );
}

/**
 * Expenses as a desktop lists them: Description, Category, Date and Amount.
 * The description is the button, so the keyboard reaches each expense once;
 * a click anywhere on the row opens it too.
 */
export function ExpenseTable({
  label,
  expenses,
  iconOf,
  onOpen,
}: {
  label: string;
  expenses: readonly Expense[];
  iconOf: (category: ExpenseCategory) => string | null;
  onOpen: (expense: Expense) => void;
}) {
  const columns = text.columns;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <table className="w-full table-fixed text-sm">
        <caption className="sr-only">{label}</caption>
        <colgroup>
          <col />
          <col className="w-[10rem]" />
          <col className="w-[9rem]" />
          <col className="w-[8rem]" />
        </colgroup>
        <thead className="border-b border-border text-left text-xs font-medium text-text-muted">
          <tr>
            <th scope="col" className={CELL}>
              {columns.description}
            </th>
            <th scope="col" className={CELL}>
              {columns.category}
            </th>
            <th scope="col" className={CELL}>
              {columns.date}
            </th>
            <th scope="col" className={`${CELL} text-right`}>
              {columns.amount}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {expenses.map((expense) => (
            <tr
              key={expense.id}
              onClick={() => onOpen(expense)}
              className="cursor-pointer transition-colors hover:bg-surface-hover"
            >
              <td className={CELL}>
                <span className="flex min-w-0 items-center gap-3">
                  <CategoryTile iconKey={iconOf(expense.category)} size="md" />
                  <button
                    type="button"
                    aria-label={text.edit(expense.description)}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(expense);
                    }}
                    className="min-w-0 truncate rounded text-left font-semibold text-text"
                  >
                    {expense.description}
                  </button>
                </span>
              </td>
              <td className={`${CELL} truncate text-text`}>{expense.category}</td>
              <td className={`${CELL} text-text`}>{formatDate(expense.expenseDate)}</td>
              <td className={`${CELL} text-right font-semibold tabular-nums text-text`}>
                {formatPaise(expense.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
