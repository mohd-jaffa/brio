import { type SupabaseClient } from "@supabase/supabase-js";
import { InventoryRepository } from "./repository";
import { type InventoryBalance, type InventoryTransaction, type InventoryTransactionRow } from "./types";
import { logInventoryTransactionSchema, type LogInventoryTransactionInput } from "@/lib/validation";

export class InventoryService {
  private readonly repository: InventoryRepository;

  constructor(client: SupabaseClient) {
    this.repository = new InventoryRepository(client);
  }

  async logTransaction(bakeryId: string, input: LogInventoryTransactionInput): Promise<InventoryTransaction> {
    const validated = logInventoryTransactionSchema.parse(input);

    const row = await this.repository.logTransaction(bakeryId, {
      product_id: validated.productId,
      type: validated.type,
      quantity: validated.quantity,
      reference_type: validated.referenceType || null,
      reference_id: validated.referenceId || null,
    });

    return this.mapRowToModel(row);
  }

  async getBalances(bakeryId: string, productIds?: string[]): Promise<InventoryBalance[]> {
    const balancesRecord = await this.repository.getBalances(bakeryId, productIds);
    
    return Object.entries(balancesRecord).map(([productId, balance]) => ({
      productId,
      balance,
    }));
  }

  private mapRowToModel(row: InventoryTransactionRow): InventoryTransaction {
    return {
      id: row.id,
      productId: row.product_id,
      type: row.type,
      quantity: row.quantity,
      referenceType: row.reference_type ?? undefined,
      referenceId: row.reference_id ?? undefined,
      createdAt: row.created_at,
    };
  }
}
