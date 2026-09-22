import { type SupabaseClient } from "@supabase/supabase-js";
import { type InventoryBalance, type InventoryTransaction, type InventoryTransactionRow } from "./types";
import { logInventoryTransactionSchema, type LogInventoryTransactionInput } from "@/lib/validation";
import { logActionSafe } from "@/features/audit/api";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";

function mapRowToModel(row: InventoryTransactionRow): InventoryTransaction {
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

/**
 * Logs an inventory ledger transaction.
 */
export async function logInventoryTransaction(
  client: SupabaseClient, 
  bakeryId: string, 
  input: LogInventoryTransactionInput
): Promise<InventoryTransaction> {
  const validated = logInventoryTransactionSchema.parse(input);

  const payload = {
    product_id: validated.productId,
    type: validated.type,
    quantity: validated.quantity,
    reference_type: validated.referenceType || null,
    reference_id: validated.referenceId || null,
    bakery_id: bakeryId,
  };

  const { data, error } = await client
    .from("inventory_transactions")
    .insert(payload)
    .select()
    .single();

  if (error) throw fromPostgrestError(error);
  const row = data as InventoryTransactionRow;

  await logActionSafe(client, {
    bakery_id: bakeryId,
    user_id: null,
    action: "CREATE",
    entity_type: "inventory_transactions",
    entity_id: row.id,
    new_data: row as unknown as Record<string, any>,
  });

  return mapRowToModel(row);
}

/**
 * Calculates current inventory balances across products.
 */
export async function getInventoryBalances(
  client: SupabaseClient, 
  bakeryId: string, 
  productIds?: string[]
): Promise<InventoryBalance[]> {
  let query = client
    .from("inventory_transactions")
    .select("product_id, quantity")
    .eq("bakery_id", bakeryId);

  if (productIds && productIds.length > 0) {
    query = query.in("product_id", productIds);
  }

  const { data, error } = await query;
  if (error) throw fromPostgrestError(error);

  const balances: Record<string, number> = {};

  for (const tx of data as { product_id: string; quantity: number }[]) {
    if (!balances[tx.product_id]) {
      balances[tx.product_id] = 0;
    }
    balances[tx.product_id] += tx.quantity;
  }
  
  return Object.entries(balances).map(([productId, balance]) => ({
    productId,
    balance,
  }));
}
