"use client";

import { useMemo } from "react";
import { Calendar, CircleDollarSign, Edit2, Plus } from "lucide-react";

import { AppShell } from "@/components/nav/AppShell";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListScreen } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { ExpenseFormSheet } from "@/features/expenses/components/ExpenseFormSheet";
import type { Expense } from "@/features/expenses/types";
import { useDisclosure } from "@/hooks/useDisclosure";
import { formatDayMonth, formatMonth } from "@/lib/format/date";
import { formatPaise } from "@/lib/format/currency";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

interface ExpenseMonth {
  month: string;
  expenses: Expense[];
}

/** Expenses in the months they fall in, newest month first — the API already sorts them. */
function byMonth(expenses: readonly Expense[]): ExpenseMonth[] {
  const months: ExpenseMonth[] = [];
  for (const expense of expenses) {
    const month = formatMonth(expense.expenseDate);
    const current = months.at(-1);
    if (current?.month === month) current.expenses.push(expense);
    else months.push({ month, expenses: [expense] });
  }
  return months;
}

export default function ExpensesPage() {
  const form = useDisclosure<Expense>();
  const query = useApiQuery<Expense[]>(apiRoutes.expenses.list);
  const months = useMemo(() => byMonth(query.data ?? []), [query.data]);

  return (
    <AppShell>
      <PageHeader icon={CircleDollarSign} title="Expenses" subtitle="Track your outgoing costs">
        <Button icon={Plus} label="Add Expense" onClick={() => form.open()} />
      </PageHeader>

      <ListScreen
        query={query}
        loadFailed="EXPENSES_LOAD_FAILED"
        data={months}
        keyOf={(group) => group.month}
        empty={
          <EmptyState
            icon={CircleDollarSign}
            title="No expenses recorded"
            hint="Start tracking your ingredient and packaging costs here."
            action={
              <Button
                icon={Plus}
                label="Record First Expense"
                variant="secondary"
                onClick={() => form.open()}
              />
            }
          />
        }
        renderItem={(group) => (
          <section className="space-y-3">
            <h2 className="pl-1 text-xs font-bold uppercase tracking-wider text-text-muted">
              {group.month}
            </h2>
            <ul role="list" className="space-y-3">
              {group.expenses.map((expense) => (
                <li key={expense.id}>
                  <article className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all hover:bg-surface-hover hover:shadow-md">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div
                        aria-hidden="true"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-danger/20 bg-danger/10 text-sm font-bold text-danger"
                      >
                        {expense.category.charAt(0)}
                      </div>
                      <div className="min-w-0 pr-2">
                        <h3 className="mb-0.5 truncate text-sm font-bold leading-tight text-text">
                          {expense.description}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} strokeWidth={3} aria-hidden="true" />
                            {formatDayMonth(expense.expenseDate)}
                          </span>
                          <span aria-hidden="true">•</span>
                          <span>{expense.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <span className="font-heading text-base font-bold leading-none text-danger">
                        {formatPaise(expense.amount)}
                      </span>
                      <IconButton
                        icon={Edit2}
                        label={`Edit ${expense.description}`}
                        onClick={() => form.open(expense)}
                      />
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        )}
      />

      <ExpenseFormSheet
        isOpen={form.isOpen}
        onClose={form.close}
        onSuccess={() => query.mutate()}
        initialData={form.subject}
      />
    </AppShell>
  );
}
