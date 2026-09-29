"use client";

import { useState } from "react";

import { Fab } from "@/components/ui/fab";
import { Hero } from "@/components/ui/hero";
import { lazySheet } from "@/components/ui/lazy-sheet";
import { LoadFailed } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { RangePicker } from "@/components/ui/range-picker";
import { RangePrompt } from "@/components/ui/range-prompt";
import { SkeletonRows } from "@/components/ui/skeleton";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { UI_TEXT } from "@/constants/messages";
import type { ExpenseCategory } from "@/constants/statuses";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useRememberedRange } from "@/hooks/useRememberedRange";
import type { Interval } from "@/lib/dates/range";
import { apiRoutes, withQuery } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

import { useExpenseCategories } from "../hooks/useExpenseCategories";
import type { Expense, ExpenseSummary } from "../types";
import { ExpenseCategories } from "./ExpenseCategories";
import { ExpensesOverview } from "./ExpensesOverview";
import { ExpenseTransactions } from "./ExpenseTransactions";

/** Kept out of the screen's first download, and fetched once it is idle (`lazySheet`). */
const ExpenseFormSheet = lazySheet(
  () => import("./ExpenseFormSheet").then((module) => module.ExpenseFormSheet),
  (props) => props.isOpen,
);

const TABS = ["OVERVIEW", "CATEGORIES", "TRANSACTIONS"] as const;
type Tab = (typeof TABS)[number];

const text = UI_TEXT.expenses;

/**
 * Expenses (plan §139.10, §139.11.11, R5.8): the compact band, the period —
 * kept for this screen on this device — and three views of it. Overview
 * carries the two figures, the category ring, the trend and the latest
 * expenses; Categories each category with its picture (R5.16); Transactions
 * every expense, by month. Everything is summed on the server (`GET
 * /api/expenses/summary`) in the business's calendar. **+** records one, and
 * any expense opens to be edited.
 */
export function Expenses() {
  const [range, setRange] = useRememberedRange("expenses");
  const [interval, setInterval] = useState<Interval | undefined>();
  const [tab, setTab] = useState<Tab>("OVERVIEW");
  const [category, setCategory] = useState<ExpenseCategory | undefined>();
  const form = useDisclosure<Expense>();
  const { names, iconOf } = useExpenseCategories();

  // A custom period waits for both its dates before it is asked for.
  const waiting = range.preset === "CUSTOM" && (!range.from || !range.to);
  const period = waiting
    ? null
    : {
        range: range.preset,
        from: range.preset === "CUSTOM" ? range.from : undefined,
        to: range.preset === "CUSTOM" ? range.to : undefined,
      };
  const summary = useApiQuery<ExpenseSummary>(
    period && withQuery(apiRoutes.expenses.summary, { ...period, interval }),
    { keepPreviousData: true },
  );
  const data = summary.data;

  const choose = (next: typeof range) => {
    setRange(next);
    setInterval(undefined);
  };
  const transactions = (next: ExpenseCategory | undefined) => {
    setCategory(next);
    setTab("TRANSACTIONS");
  };

  return (
    <div className="space-y-6">
      <PageHeader title={text.title} subtitle={text.subtitle}>
        <RangePicker value={range} onChange={choose} />
        <Fab label={text.add} onClick={() => form.open()} />
      </PageHeader>
      <Hero variant="band" lines={text.bandLines} tagline={text.bandTagline} plate="brownies" priority />

      <Tabs
        id="expenses"
        label={text.tabs}
        value={tab}
        onChange={setTab}
        options={TABS.map((value) => ({ value, label: text.tabNames[value] }))}
      />

      <TabPanel id="expenses" value={tab}>
        {period === null ? (
          <RangePrompt />
        ) : tab === "TRANSACTIONS" ? (
          <ExpenseTransactions
            period={period}
            categories={names}
            category={category}
            onCategory={setCategory}
            iconOf={iconOf}
            onOpen={form.open}
            onAdd={() => form.open()}
          />
        ) : data ? (
          tab === "OVERVIEW" ? (
            <ExpensesOverview
              summary={data}
              iconOf={iconOf}
              onInterval={setInterval}
              onOpen={form.open}
              onViewAll={() => transactions(undefined)}
            />
          ) : (
            <ExpenseCategories summary={data} iconOf={iconOf} onOpenCategory={transactions} />
          )
        ) : summary.error ? (
          <LoadFailed query={summary} loadFailed="EXPENSES_LOAD_FAILED" />
        ) : (
          <div role="status" aria-busy="true" aria-label={text.loading}>
            <SkeletonRows rows={3} height="h-32" />
          </div>
        )}
      </TabPanel>

      <ExpenseFormSheet isOpen={form.isOpen} onClose={form.close} initialData={form.subject} />
    </div>
  );
}
