import { type SupabaseClient } from "@supabase/supabase-js";
import { ExpensesRepository } from "./repository";
import { type Expense, type ExpenseRow } from "./types";
import { createExpenseSchema, updateExpenseSchema, type CreateExpenseInput, type UpdateExpenseInput } from "@/lib/validation";
import { AuditService } from "@/features/audit/service";

export class ExpensesService {
  private readonly repository: ExpensesRepository;
  private readonly auditService: AuditService;

  constructor(client: SupabaseClient) {
    this.repository = new ExpensesRepository(client);
    this.auditService = new AuditService(client);
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
    
    await this.auditService.logAction({
      bakery_id: bakeryId,
      user_id: null,
      action: "CREATE",
      entity_type: "expenses",
      entity_id: row.id,
      new_data: row as unknown as Record<string, any>,
    });

    return this.mapToModel(row);
  }

  async updateExpense(bakeryId: string, id: string, input: UpdateExpenseInput): Promise<Expense> {
    const validated = updateExpenseSchema.parse(input);
    
    const previousRow = await this.repository.findById(bakeryId, id);

    const payload: Partial<ExpenseRow> = {};
    if (validated.category !== undefined) payload.category = validated.category;
    if (validated.description !== undefined) payload.description = validated.description;
    if (validated.amount !== undefined) payload.amount = validated.amount;
    if (validated.expenseDate !== undefined) payload.expense_date = validated.expenseDate;
    if (validated.paymentMethod !== undefined) payload.payment_method = validated.paymentMethod;
    if (validated.receiptUrl !== undefined) payload.receipt_url = validated.receiptUrl;

    const row = await this.repository.update(bakeryId, id, payload);

    await this.auditService.logAction({
      bakery_id: bakeryId,
      user_id: null,
      action: "UPDATE",
      entity_type: "expenses",
      entity_id: row.id,
      previous_data: previousRow as unknown as Record<string, any>,
      new_data: row as unknown as Record<string, any>,
    });

    return this.mapToModel(row);
  }

  async deleteExpense(bakeryId: string, id: string): Promise<void> {
    // Check existence first to throw 404 if not found
    const previousRow = await this.repository.findById(bakeryId, id);
    await this.repository.delete(bakeryId, id);

    await this.auditService.logAction({
      bakery_id: bakeryId,
      user_id: null,
      action: "DELETE",
      entity_type: "expenses",
      entity_id: id,
      previous_data: previousRow as unknown as Record<string, any>,
    });
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
