"use client";

import { ReceiptText, Wallet } from "lucide-react";

import { BarTrend } from "@/components/ui/charts/bar-trend";
import { Donut } from "@/components/ui/charts/donut";
import { IntervalSelect } from "@/components/ui/charts/interval-select";
import { QuoteBlock } from "@/components/ui/quote-block";
import { RowList } from "@/components/ui/row";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatTile } from "@/components/ui/stat-tile";
import { UI_TEXT } from "@/constants/messages";
import type { ExpenseCategory } from "@/constants/statuses";
import { percentChange } from "@/features/analytics/summary";
import type { Interval } from "@/lib/dates/range";
import { formatPaise } from "@/lib/format/currency";
import { formatDayMonth } from "@/lib/format/date";

import type { Expense, ExpenseFigure, ExpenseSummary } from "../types";
import { ExpenseRow, ExpenseTable } from "./ExpenseRow";

const text = UI_TEXT.expenses;

/** A figure's change on the period before; a cost that rose is bad news. */
function delta(figure: ExpenseFigure) {
  const change = percentChange(figure);
  return change === undefined ? undefined : { change, up: "bad" as const, since: text.vsPrevious };
}

/**
 * Overview (plan §139.10, §139.11.11): the total and the daily average with
 * their change on the period before, where the money went by category, the
 * trend by day or week, and the latest expenses. A desktop sets the figures
 * in a row, the ring and the bars side by side, and the latest expenses as a
 * table (plan §139.10).
 */
export function ExpensesOverview({
  summary,
  iconOf,
  onInterval,
  onOpen,
  onViewAll,
}: {
  summary: ExpenseSummary;
  iconOf: (category: ExpenseCategory) => string | null;
  onInterval: (next: Interval) => void;
  onOpen: (expense: Expense) => void;
  onViewAll: () => void;
}) {
  const total = formatPaise(summary.total.value);
  const top = summary.byCategory[0];

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 lg:gap-4">
        <StatTile
          label={text.total}
          value={total}
          icon={Wallet}
          headline
          delta={delta(summary.total)}
          trend={summary.trend.map((group) => group.value)}
        />
        <StatTile
          label={text.dailyAverage}
          value={formatPaise(summary.dailyAverage.value)}
          icon={ReceiptText}
          headline
          delta={delta(summary.dailyAverage)}
        />
      </dl>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Donut
          title={text.byCategory}
          summary={top.total > 0 ? text.byCategorySummary(top.category, formatPaise(top.total), total) : text.nothing}
          slices={summary.byCategory.map((category) => ({ label: category.category, value: category.total }))}
          totalLabel={text.total}
          labelHeading={UI_TEXT.charts.category}
          emptyMessage={text.nothing}
        />
        <BarTrend
          title={text.trend}
          summary={text.trendSummary(total)}
          points={summary.trend.map((group) => ({ label: formatDayMonth(group.start), value: group.value }))}
          labelHeading={UI_TEXT.charts.date}
          action={<IntervalSelect value={summary.interval} onChange={onInterval} />}
          emptyMessage={text.nothing}
        />
      </div>

      <section aria-labelledby="expenses-recent">
        <SectionHeading
          id="expenses-recent"
          title={text.recent}
          viewAll={{ label: text.viewAll, name: text.viewAllName, onClick: onViewAll }}
        />
        {summary.recent.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-text-muted shadow-card">
            {text.nothing}
          </p>
        ) : (
          <>
            <RowList label={text.recent} className="lg:hidden">
              {summary.recent.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} iconKey={iconOf(expense.category)} onOpen={onOpen} />
              ))}
            </RowList>
            <div className="hidden lg:block">
              <ExpenseTable label={text.recent} expenses={summary.recent} iconOf={iconOf} onOpen={onOpen} />
            </div>
          </>
        )}
      </section>

      <QuoteBlock quote={text.quote} plate="cake-table" />
    </div>
  );
}
