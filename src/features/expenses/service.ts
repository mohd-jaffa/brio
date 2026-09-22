import { type SupabaseClient } from "@supabase/supabase-js";
import { ExpensesRepository } from "./repository";
import { type Expense, type ExpenseRow } from "./types";
import { createExpenseSchema, updateExpenseSchema, type CreateExpenseInput, type UpdateExpenseInput } from "@/lib/validation";

export class ExpensesService {
  private readonly repository: ExpensesRepository;

  constructor(client: SupabaseClient) {
    this.repository = new ExpensesRepository(client);
  }

  async getAllExpenses(bakeryId: string): Promise<Expense[]> {
    const rows = await this.repository.findAll(bakeryId);
    return rows.map(this.mapToModel);
  }

  async getExpenseById(bakeryId: string, id: string): Promise<Expense> {
    const row = await this.repository.findById(bakeryId, id);
    return this.mapToModel(row);
  }

  async createExpense(bakeryId: string, input: CreateExpenseInput): Promise<Expense> {
    const validated = createExpenseSchema.parse(input);
    
    const row = await this.repository.create(bakeryId, {
      category: validated.category,
      description: validated.description,
      amount: validated.amount,
      expense_date: validated.expenseDate,
      payment_method: validated.paymentMethod,
      receipt_url: validated.receiptUrl ?? null,
    });
    
    return this.mapToModel(row);
  }

  async updateExpense(bakeryId: string, id: string, input: UpdateExpenseInput): Promise<Expense> {
    const validated = updateExpenseSchema.parse(input);
    
    const payload: Partial<ExpenseRow> = {};
    if (validated.category !== undefined) payload.category = validated.category;
    if (validated.description !== undefined) payload.description = validated.description;
    if (validated.amount !== undefined) payload.amount = validated.amount;
    if (validated.expenseDate !== undefined) payload.expense_date = validated.expenseDate;
    if (validated.paymentMethod !== undefined) payload.payment_method = validated.paymentMethod;
    if (validated.receiptUrl !== undefined) payload.receipt_url = validated.receiptUrl;

    const row = await this.repository.update(bakeryId, id, payload);
    return this.mapToModel(row);
  }

  async deleteExpense(bakeryId: string, id: string): Promise<void> {
    // Check existence first to throw 404 if not found
    await this.getExpenseById(bakeryId, id);
    await this.repository.delete(bakeryId, id);
  }

  private mapToModel(row: ExpenseRow): Expense {
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
}
