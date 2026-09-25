import type { Tenant } from "@/lib/supabase/tenant";

import { EDITABLE_COLUMNS } from "@/constants/editableColumns";
import { blankToNull, definedOnly } from "@/lib/supabase/columns";
import { tenantRecords } from "@/lib/supabase/records";
import type { CreateExpensePayload, UpdateExpensePayload } from "@/lib/validation";

import type { Expense, ExpenseRow } from "./types";

/** A bakery's expenses, newest day first. */
const expenses = (tenant: Tenant) =>
  tenantRecords<ExpenseRow>(tenant, "expenses");

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

export async function getAllExpenses(tenant: Tenant): Promise<Expense[]> {
  const rows = await expenses(tenant).list([
    { column: "expense_date", ascending: false },
    { column: "created_at", ascending: false },
  ]);
  return rows.map(toExpense);
}

export async function getExpenseById(
  tenant: Tenant,
  id: string,
): Promise<Expense> {
  return toExpense(await expenses(tenant).find(id));
}

export async function createExpense(
  tenant: Tenant,
  input: CreateExpensePayload,
): Promise<Expense> {
  return toExpense(await expenses(tenant).insert(toColumns(input)));
}

export async function updateExpense(
  tenant: Tenant,
  id: string,
  input: UpdateExpensePayload,
): Promise<Expense> {
  const row = await expenses(tenant).update(id, toColumns(input), EDITABLE_COLUMNS.expenses);
  return toExpense(row);
}

export async function deleteExpense(
  tenant: Tenant,
  id: string,
): Promise<Expense> {
  return toExpense(await expenses(tenant).remove(id));
}
