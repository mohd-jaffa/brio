import type { Tenant } from "@/lib/supabase/tenant";

import { pageWindow, toPage, type Page } from "@/lib/api/pagination";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { definedOnly } from "@/lib/supabase/columns";
import { tenantRecords } from "@/lib/supabase/records";
import type { LogInventoryTransactionPayload, StockLedgerQuery } from "@/lib/validation";

import type { InventoryBalance, InventoryTransaction, InventoryTransactionRow } from "./types";

/**
 * The inventory ledger (AGENTS.md §14). Nothing updates a stock level: a
 * movement is appended, and a balance is the sum of a product's movements, so
 * two things happening at once cannot lose one of them.
 */
const ledger = (tenant: Tenant) => tenantRecords<InventoryTransactionRow>(tenant, "inventory_transactions");

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
  tenant: Tenant,
  input: LogInventoryTransactionPayload,
): Promise<InventoryTransaction> {
  const row = await ledger(tenant).insert(
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

/** A product's row of `stock_levels` (0019_stock_levels.sql). */
interface StockLevelRow {
  product_id: string;
  balance: number;
  stocked: boolean;
  last_moved_at: string;
}

/**
 * What is in stock now, per product, added up in the database (`stock_levels`),
 * so it holds however long the ledger grows — a read of the lines themselves
 * stops at the API's row limit. A product with no movements has no row.
 */
export async function getInventoryBalances(tenant: Tenant, productIds?: string[]): Promise<InventoryBalance[]> {
  const { supabase: client, bakeryId } = tenant;
  let query = client
    .from("stock_levels")
    .select("product_id, balance, stocked, last_moved_at")
    .eq("bakery_id", bakeryId);
  if (productIds && productIds.length > 0) query = query.in("product_id", productIds);

  const { data, error } = await query;
  if (error) throw fromPostgrestError(error);
  return ((data ?? []) as StockLevelRow[]).map((row) => ({
    productId: row.product_id,
    balance: row.balance,
    stocked: row.stocked,
    lastMovedAt: row.last_moved_at,
  }));
}

/**
 * One product's ledger, newest first, a page at a time (plan §139.10): every
 * movement that made its balance — what came in, what orders reserved, used
 * or released, and what was adjusted or wasted.
 */
export async function listStockMovements(tenant: Tenant, query: StockLedgerQuery): Promise<Page<InventoryTransaction>> {
  const { from, to } = pageWindow(query.cursor);
  const { data, error } = await tenant.supabase
    .from("inventory_transactions")
    .select("*")
    .eq("bakery_id", tenant.bakeryId)
    .eq("product_id", query.product)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, to);
  if (error) throw fromPostgrestError(error);
  const page = toPage((data ?? []) as InventoryTransactionRow[], query.cursor);
  return { ...page, items: page.items.map(toTransaction) };
}
