export type InventoryTransactionType =
  | "STOCK_IN"
  | "ORDER_RESERVATION"
  | "ORDER_CONSUMPTION"
  | "ADJUSTMENT"
  | "WASTAGE"
  | "RETURN";

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
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
}

export interface InventoryBalance {
  productId: string;
  balance: number;
}
