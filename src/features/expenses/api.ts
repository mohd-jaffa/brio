import type { SupabaseClient } from "@supabase/supabase-js";

import { EDITABLE_COLUMNS } from "@/constants/editableColumns";
import { blankToNull, definedOnly } from "@/lib/supabase/columns";
import { tenantRecords } from "@/lib/supabase/records";
import type { CreateExpensePayload, UpdateExpensePayload } from "@/lib/validation";

import type { Expense, ExpenseRow } from "./types";

/** A bakery's expenses, newest day first. */
const expenses = (client: SupabaseClient, bakeryId: string) =>
  tenantRecords<ExpenseRow>(client, "expenses", bakeryId);

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

export async function getAllExpenses(client: SupabaseClient, bakeryId: string): Promise<Expense[]> {
  const rows = await expenses(client, bakeryId).list([
    { column: "expense_date", ascending: false },
    { column: "created_at", ascending: false },
  ]);
  return rows.map(toExpense);
}

export async function getExpenseById(
  client: SupabaseClient,
  bakeryId: string,
  id: string,
): Promise<Expense> {
  return toExpense(await expenses(client, bakeryId).find(id));
}

export async function createExpense(
  client: SupabaseClient,
  bakeryId: string,
  input: CreateExpensePayload,
): Promise<Expense> {
  return toExpense(await expenses(client, bakeryId).insert(toColumns(input)));
}

export async function updateExpense(
  client: SupabaseClient,
  bakeryId: string,
  id: string,
  input: UpdateExpensePayload,
): Promise<Expense> {
  const row = await expenses(client, bakeryId).update(id, toColumns(input), EDITABLE_COLUMNS.expenses);
  return toExpense(row);
}

export async function deleteExpense(
  client: SupabaseClient,
  bakeryId: string,
  id: string,
): Promise<Expense> {
  return toExpense(await expenses(client, bakeryId).remove(id));
}
