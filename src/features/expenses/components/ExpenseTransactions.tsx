"use client";

import { ReceiptText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListScreen } from "@/components/ui/list-screen";
import { RowList } from "@/components/ui/row";
import { optionsOf, SelectField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import type { ExpenseCategory } from "@/constants/statuses";
import { formatMonth } from "@/lib/format/date";
import { apiRoutes, withQuery } from "@/lib/query/keys";
import { useApiPages } from "@/lib/query/useApiPages";

import type { Expense } from "../types";
import { ExpenseRow, ExpenseTable } from "./ExpenseRow";

const text = UI_TEXT.expenses;

interface ExpenseMonth {
  month: string;
  expenses: Expense[];
}

/** Expenses in the months they fall in, newest first — the API already sorts them. */
export function byMonth(expenses: readonly Expense[]): ExpenseMonth[] {
  const months: ExpenseMonth[] = [];
  for (const expense of expenses) {
    const month = formatMonth(expense.expenseDate);
    const current = months.at(-1);
    if (current?.month === month) current.expenses.push(expense);
    else months.push({ month, expenses: [expense] });
  }
  return months;
}

/**
 * Transactions (plan §139.10): the period's expenses, newest first and a
 * page at a time, grouped by month and narrowed to one category if chosen.
 * Rows on a phone and a tablet, a table from 1024 px; each opens the expense
 * to be edited.
 */
export function ExpenseTransactions({
  period,
  categories,
  category,
  onCategory,
  iconOf,
  onOpen,
  onAdd,
}: {
  /** The period's query, or null while a custom one still waits for its dates. */
  period: { range: string; from?: string; to?: string } | null;
  /** The business's categories, its own among them, to filter by. */
  categories: readonly ExpenseCategory[];
  category: ExpenseCategory | undefined;
  onCategory: (next: ExpenseCategory | undefined) => void;
  iconOf: (category: ExpenseCategory) => string | null;
  onOpen: (expense: Expense) => void;
  onAdd: () => void;
}) {
  const pages = useApiPages<Expense>(period && withQuery(apiRoutes.expenses.list, { ...period, category }));

  return (
    <div className="space-y-4">
      <div className="sm:max-w-xs">
        <SelectField
          label={text.category}
          placeholder={text.allCategories}
          options={optionsOf(categories)}
          value={category ?? ""}
          onChange={(chosen) => onCategory((chosen || undefined) as ExpenseCategory | undefined)}
        />
      </div>
      <ListScreen
        query={{ ...pages, isLoading: pages.isLoading || period === null }}
        loadFailed="EXPENSES_LOAD_FAILED"
        data={period ? pages.data : undefined}
        noMatches={category && text.noneInCategory(category)}
        empty={
          <EmptyState
            icon={ReceiptText}
            title={text.emptyTitle}
            hint={text.emptyHint}
            action={<Button label={text.add} variant="secondary" onClick={onAdd} />}
          />
        }
        renderList={(items) => (
          <div className="space-y-6">
            {byMonth(items).map((group) => (
              <section key={group.month} aria-label={group.month} className="space-y-2">
                <h2 className="pl-1 text-xs font-semibold uppercase tracking-wider text-text-muted">{group.month}</h2>
                <RowList label={group.month} className="lg:hidden">
                  {group.expenses.map((expense) => (
                    <ExpenseRow key={expense.id} expense={expense} iconKey={iconOf(expense.category)} onOpen={onOpen} />
                  ))}
                </RowList>
                <div className="hidden lg:block">
                  <ExpenseTable label={group.month} expenses={group.expenses} iconOf={iconOf} onOpen={onOpen} />
                </div>
              </section>
            ))}
          </div>
        )}
      />
    </div>
  );
}
