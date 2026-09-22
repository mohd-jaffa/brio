import { type SupabaseClient } from "@supabase/supabase-js";
import { type ExpenseRow } from "./types";
import { NotFoundError } from "@/shared/errors/app-error";
import { ERROR_MESSAGES } from "@/constants/messages";

export class ExpensesRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findAll(bakeryId: string): Promise<ExpenseRow[]> {
    const { data, error } = await this.client
      .from("expenses")
      .select("*")
      .eq("bakery_id", bakeryId)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  async findById(bakeryId: string, id: string): Promise<ExpenseRow> {
    const { data, error } = await this.client
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

    return data;
  }

  async create(bakeryId: string, payload: Omit<ExpenseRow, "id" | "bakery_id" | "created_at" | "updated_at">): Promise<ExpenseRow> {
    const { data, error } = await this.client
      .from("expenses")
      .insert([{ bakery_id: bakeryId, ...payload }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(bakeryId: string, id: string, payload: Partial<Omit<ExpenseRow, "id" | "bakery_id" | "created_at" | "updated_at">>): Promise<ExpenseRow> {
    const { data, error } = await this.client
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

    return data;
  }

  async delete(bakeryId: string, id: string): Promise<void> {
    const { error } = await this.client
      .from("expenses")
      .delete()
      .eq("bakery_id", bakeryId)
      .eq("id", id);

    if (error) throw error;
  }
}
