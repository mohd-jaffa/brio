import { type SupabaseClient } from "@supabase/supabase-js";
import { type Expense, type ExpenseRow } from "./types";
import { createExpenseSchema, updateExpenseSchema, type CreateExpenseInput, type UpdateExpenseInput } from "@/lib/validation";
import { logActionSafe } from "@/features/audit/api";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { requireRow } from "@/lib/supabase/writes";
import { pickColumns } from "@/lib/supabase/columns";
import { EDITABLE_COLUMNS } from "@/constants/editableColumns";

function mapToModel(row: ExpenseRow): Expense {
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

/**
 * Reads all expenses for a bakery, newest first.
 */
export async function getAllExpenses(client: SupabaseClient, bakeryId: string): Promise<Expense[]> {
  const { data, error } = await client
    .from("expenses")
    .select("*")
    .eq("bakery_id", bakeryId)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw fromPostgrestError(error);
  return (data as ExpenseRow[]).map(mapToModel);
}

/**
 * Reads a single expense by id.
 */
export async function getExpenseById(client: SupabaseClient, bakeryId: string, id: string): Promise<Expense> {
  const { data, error } = await client
    .from("expenses")
    .select("*")
    .eq("bakery_id", bakeryId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw fromPostgrestError(error);
  const row = await requireRow<ExpenseRow>(
    Promise.resolve({ data, error: null } as any),
    "RECORD_NOT_FOUND"
  );
  return mapToModel(row);
}

/**
 * Creates a new expense record.
 */
export async function createExpense(
  client: SupabaseClient, 
  bakeryId: string, 
  input: CreateExpenseInput
): Promise<Expense> {
  const validated = createExpenseSchema.parse(input);
  
  const { data, error } = await client
    .from("expenses")
    .insert([{ 
      bakery_id: bakeryId,
      category: validated.category,
      description: validated.description,
      amount: validated.amount,
      expense_date: validated.expenseDate,
      payment_method: validated.paymentMethod,
      receipt_url: validated.receiptUrl ?? null,
    }])
    .select()
    .single();

  if (error) throw fromPostgrestError(error);
  const row = data as ExpenseRow;

  await logActionSafe(client, {
    bakery_id: bakeryId,
    user_id: null,
    action: "CREATE",
    entity_type: "expenses",
    entity_id: row.id,
    new_data: row as unknown as Record<string, any>,
  });

  return mapToModel(row);
}

/**
 * Updates an expense record using pickColumns and requireRow.
 */
export async function updateExpense(
  client: SupabaseClient,
  bakeryId: string,
  id: string,
  input: UpdateExpenseInput
): Promise<Expense> {
  const validated = updateExpenseSchema.parse(input);
  const previousRow = await getExpenseById(client, bakeryId, id);

  const rawPatch: Partial<Record<string, any>> = {};
  if (validated.category !== undefined) rawPatch.category = validated.category;
  if (validated.description !== undefined) rawPatch.description = validated.description;
  if (validated.amount !== undefined) rawPatch.amount = validated.amount;
  if (validated.expenseDate !== undefined) rawPatch.expense_date = validated.expenseDate;
  if (validated.paymentMethod !== undefined) rawPatch.payment_method = validated.paymentMethod;
  if (validated.receiptUrl !== undefined) rawPatch.receipt_url = validated.receiptUrl ?? null;

  const patch = pickColumns(rawPatch, EDITABLE_COLUMNS.expenses);

  const row = await requireRow<ExpenseRow>(
    client
      .from("expenses")
      .update(patch)
      .eq("bakery_id", bakeryId)
      .eq("id", id)
      .select()
      .maybeSingle(),
    "RECORD_NOT_FOUND"
  );

  await logActionSafe(client, {
    bakery_id: bakeryId,
    user_id: null,
    action: "UPDATE",
    entity_type: "expenses",
    entity_id: row.id,
    previous_data: previousRow as unknown as Record<string, any>,
    new_data: row as unknown as Record<string, any>,
  });

  return mapToModel(row);
}

/**
 * Deletes an expense record safely.
 */
export async function deleteExpense(client: SupabaseClient, bakeryId: string, id: string): Promise<void> {
  const previousRow = await getExpenseById(client, bakeryId, id);

  const { error } = await client
    .from("expenses")
    .delete()
    .eq("bakery_id", bakeryId)
    .eq("id", id);

  if (error) throw fromPostgrestError(error);

  await logActionSafe(client, {
    bakery_id: bakeryId,
    user_id: null,
    action: "DELETE",
    entity_type: "expenses",
    entity_id: id,
    previous_data: previousRow as unknown as Record<string, any>,
  });
}
