import type { SupabaseClient } from "@supabase/supabase-js";

import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { definedOnly } from "@/lib/supabase/columns";
import { tenantRecords } from "@/lib/supabase/records";
import type { LogInventoryTransactionPayload } from "@/lib/validation";

import type { InventoryBalance, InventoryTransaction, InventoryTransactionRow } from "./types";

/**
 * The inventory ledger (AGENTS.md §14). Nothing updates a stock level: a
 * movement is appended, and a balance is the sum of a product's movements, so
 * two things happening at once cannot lose one of them.
 */
const ledger = (client: SupabaseClient, bakeryId: string) =>
  tenantRecords<InventoryTransactionRow>(client, "inventory_transactions", bakeryId);

export function toTransaction(row: InventoryTransactionRow): InventoryTransaction {
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

export async function logInventoryTransaction(
  client: SupabaseClient,
  bakeryId: string,
  input: LogInventoryTransactionPayload,
): Promise<InventoryTransaction> {
  const row = await ledger(client, bakeryId).insert(
    definedOnly({
      product_id: input.productId,
      type: input.type,
      quantity: input.quantity,
      reference_type: input.referenceType,
      reference_id: input.referenceId,
    }),
  );
  return toTransaction(row);
}

/** What is in stock now, per product: the sum of its ledger lines. */
export async function getInventoryBalances(
  client: SupabaseClient,
  bakeryId: string,
  productIds?: string[],
): Promise<InventoryBalance[]> {
  let query = client
    .from("inventory_transactions")
    .select("product_id, quantity")
    .eq("bakery_id", bakeryId);

  if (productIds && productIds.length > 0) query = query.in("product_id", productIds);

  const { data, error } = await query;
  if (error) throw fromPostgrestError(error);

  const balances = new Map<string, number>();
  for (const line of (data ?? []) as { product_id: string; quantity: number }[]) {
    balances.set(line.product_id, (balances.get(line.product_id) ?? 0) + line.quantity);
  }

  return [...balances].map(([productId, balance]) => ({ productId, balance }));
}
