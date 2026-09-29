import type { Tenant } from "@/lib/supabase/tenant";

import { EDITABLE_COLUMNS } from "@/constants/editableColumns";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/constants/statuses";
import { pageWindow, toPage, type Page } from "@/lib/api/pagination";
import { todayKey } from "@/lib/dates/calendar";
import { intervalFor, previousPeriod, resolvePeriod } from "@/lib/dates/range";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { blankToNull, definedOnly } from "@/lib/supabase/columns";
import { readAll } from "@/lib/supabase/readAll";
import { tenantRecords } from "@/lib/supabase/records";
import type { CreateExpensePayload, ExpenseListQuery, RangeQuery, UpdateExpensePayload } from "@/lib/validation";

import { customCategoryNames } from "./categories";
import { summariseExpenses } from "./summary";
import type { Expense, ExpenseRow, ExpenseSummary } from "./types";

/** A bakery's expenses, newest day first. */
const expenses = (tenant: Tenant) => tenantRecords<ExpenseRow>(tenant, "expenses");

export function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    category: row.category,
    description: row.description,
    amount: row.amount,
    expenseDate: row.expense_date,
    paymentMethod: row.payment_method,
    receiptUrl: row.receipt_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toColumns(input: UpdateExpensePayload) {
  return definedOnly({
    category: input.category,
    description: input.description,
    amount: input.amount,
    expense_date: input.expenseDate,
    payment_method: input.paymentMethod,
    receipt_url: blankToNull(input.receiptUrl),
  });
}

/**
 * A page of the period's expenses, newest day first — one category's, or
 * every one (the Transactions tab, plan §139.10). The period is resolved in
 * the business's calendar, as the summary resolves it.
 */
export async function listExpenses(
  tenant: Tenant,
  query: ExpenseListQuery,
  now: Date = new Date(),
): Promise<Page<Expense>> {
  const period = resolvePeriod({ preset: query.range, from: query.from, to: query.to }, todayKey(now));
  const window = pageWindow(query.cursor);
  let request = tenant.supabase
    .from("expenses")
    .select("*")
    .eq("bakery_id", tenant.bakeryId)
    .gte("expense_date", period.from)
    .lte("expense_date", period.to);
  if (query.category) request = request.eq("category", query.category);

  const { data, error } = await request
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(window.from, window.to);
  if (error) throw fromPostgrestError(error);
  const page = toPage((data ?? []) as ExpenseRow[], query.cursor);
  return { ...page, items: page.items.map(toExpense) };
}

/**
 * Expenses for a period and the one before (`GET /api/expenses/summary`, plan
 * §139.11.11), read a window at a time past the API's row limit and summed
 * on the server, in the business's calendar.
 */
export async function getExpenseSummary(
  tenant: Tenant,
  query: RangeQuery,
  now: Date = new Date(),
): Promise<ExpenseSummary> {
  const range = { preset: query.range, from: query.from, to: query.to };
  const period = resolvePeriod(range, todayKey(now));
  const previous = previousPeriod(range, period);
  const [rows, custom] = await Promise.all([
    readAll<ExpenseRow>((from, to) =>
      tenant.supabase
        .from("expenses")
        .select("*")
        .eq("bakery_id", tenant.bakeryId)
        .gte("expense_date", previous.from)
        .lte("expense_date", period.to)
        .order("id", { ascending: true })
        .range(from, to),
    ),
    customCategoryNames(tenant),
  ]);
  return summariseExpenses(rows.map(toExpense), period, previous, intervalFor(period, query.interval), [
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...custom,
  ]);
}

export async function getExpenseById(tenant: Tenant, id: string): Promise<Expense> {
  return toExpense(await expenses(tenant).find(id));
}

export async function createExpense(tenant: Tenant, input: CreateExpensePayload): Promise<Expense> {
  return toExpense(await expenses(tenant).insert(toColumns(input)));
}

export async function updateExpense(tenant: Tenant, id: string, input: UpdateExpensePayload): Promise<Expense> {
  const row = await expenses(tenant).update(id, toColumns(input), EDITABLE_COLUMNS.expenses);
  return toExpense(row);
}

export async function deleteExpense(tenant: Tenant, id: string): Promise<Expense> {
  return toExpense(await expenses(tenant).remove(id));
}
