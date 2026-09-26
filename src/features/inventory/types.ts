import type { InventoryTransactionType } from "@/constants/statuses";

export type { InventoryTransactionType };

export interface InventoryTransactionRow {
  id: string;
  bakery_id: string;
  product_id: string;
  type: InventoryTransactionType;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  type: InventoryTransactionType;
  /** Signed: positive adds to stock, negative takes from it (AGENTS.md §14). */
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
}

/**
 * What is on the shelf for one product (`stock_levels`, 0019): the sum of its
 * ledger, whether its stock is kept at all — a product nobody counts is made
 * to order — and when it last moved.
 */
export interface InventoryBalance {
  productId: string;
  balance: number;
  stocked: boolean;
  lastMovedAt: string;
}
