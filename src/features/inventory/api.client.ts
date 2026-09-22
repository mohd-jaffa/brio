import { apiRoutes } from "@/lib/query/keys";
import { getJson, postJson } from "@/lib/api/client";
import type { LogInventoryTransactionInput } from "@/lib/validation";

import type { InventoryBalance, InventoryTransaction } from "./types";

export const InventoryClient = {
  balances: (productIds?: readonly string[]) =>
    getJson<InventoryBalance[]>(apiRoutes.inventory.balances(productIds)),
  adjustStock: (payload: LogInventoryTransactionInput) =>
    postJson<InventoryTransaction>(apiRoutes.inventory.transactions, payload),
};
