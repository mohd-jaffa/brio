import { type SupabaseClient } from "@supabase/supabase-js";
import { type InventoryTransactionRow } from "./inventory.types";
import { ExternalServiceError } from "@/shared/errors/app-error";
import { ERROR_CODES } from "@/shared/constants/errors";

export class InventoryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async logTransaction(
    bakeryId: string,
    payload: Omit<InventoryTransactionRow, "id" | "bakery_id" | "created_at">,
  ): Promise<InventoryTransactionRow> {
    const { data, error } = await this.client
      .from("inventory_transactions")
      .insert({ ...payload, bakery_id: bakeryId })
      .select()
      .single();

    if (error) {
      throw this.mapDatabaseError(error);
    }

    return data as InventoryTransactionRow;
  }

  async getBalances(bakeryId: string, productIds?: string[]): Promise<Record<string, number>> {
    let query = this.client
      .from("inventory_transactions")
      .select("product_id, quantity")
      .eq("bakery_id", bakeryId);

    if (productIds && productIds.length > 0) {
      query = query.in("product_id", productIds);
    }

    const { data, error } = await query;

    if (error) {
      throw this.mapDatabaseError(error);
    }

    const balances: Record<string, number> = {};

    for (const tx of data as { product_id: string; quantity: number }[]) {
      if (!balances[tx.product_id]) {
        balances[tx.product_id] = 0;
      }
      balances[tx.product_id] += tx.quantity;
    }

    return balances;
  }

  private mapDatabaseError(error: unknown) {
    return new ExternalServiceError(ERROR_CODES.EXTERNAL_SERVICE_ERROR, undefined, error);
  }
}
