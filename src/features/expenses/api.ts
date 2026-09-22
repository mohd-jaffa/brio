import { type SupabaseClient } from "@supabase/supabase-js";
import { type Expense, type ExpenseRow } from "./types";
import { createExpenseSchema, updateExpenseSchema, type CreateExpenseInput, type UpdateExpenseInput } from "@/lib/validation";
import { NotFoundError } from "@/shared/errors/app-error";
import { logActionSafe } from "@/features/audit/api";

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

export async function getAllExpenses(client: SupabaseClient, bakeryId: string): Promise<Expense[]> {
  const { data, error } = await client
    .from("expenses")
    .select("*")
    .eq("bakery_id", bakeryId)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  
  const rows = data as ExpenseRow[];
  return rows.map(mapToModel);
}

export async function getExpenseById(client: SupabaseClient, bakeryId: string, id: string): Promise<Expense> {
  const { data, error } = await client
    .from("expenses")
    .select("*")
    .eq("bakery_id", bakeryId)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new NotFoundError("NOT_FOUND", "Expense not found");
    }
    throw error;
  }

  return mapToModel(data as ExpenseRow);
}

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

  if (error) throw error;
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

export async function updateExpense(
  client: SupabaseClient,
  bakeryId: string,
  id: string,
  input: UpdateExpenseInput
): Promise<Expense> {
  const validated = updateExpenseSchema.parse(input);
  const previousRow = await getExpenseById(client, bakeryId, id);

  const payload: Partial<Omit<ExpenseRow, "id" | "bakery_id" | "created_at" | "updated_at">> = {};
  if (validated.category !== undefined) payload.category = validated.category;
  if (validated.description !== undefined) payload.description = validated.description;
  if (validated.amount !== undefined) payload.amount = validated.amount;
  if (validated.expenseDate !== undefined) payload.expense_date = validated.expenseDate;
  if (validated.paymentMethod !== undefined) payload.payment_method = validated.paymentMethod;
  if (validated.receiptUrl !== undefined) payload.receipt_url = validated.receiptUrl ?? null;

  const { data, error } = await client
    .from("expenses")
    .update(payload)
    .eq("bakery_id", bakeryId)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new NotFoundError("NOT_FOUND", "Expense not found");
    }
    throw error;
  }

  const row = data as ExpenseRow;

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

export async function deleteExpense(client: SupabaseClient, bakeryId: string, id: string): Promise<void> {
  const previousRow = await getExpenseById(client, bakeryId, id);

  const { error } = await client
    .from("expenses")
    .delete()
    .eq("bakery_id", bakeryId)
    .eq("id", id);

  if (error) throw error;

  await logActionSafe(client, {
    bakery_id: bakeryId,
    user_id: null,
    action: "DELETE",
    entity_type: "expenses",
    entity_id: id,
    previous_data: previousRow as unknown as Record<string, any>,
  });
}
