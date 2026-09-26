import { apiRoutes } from "@/lib/query/keys";
import { postJson } from "@/lib/api/client";
import type { LogInventoryTransactionInput } from "@/lib/validation";

import type { InventoryTransaction } from "./types";

export const InventoryClient = {
  adjustStock: (payload: LogInventoryTransactionInput) =>
    postJson<InventoryTransaction>(apiRoutes.inventory.transactions, payload),
};
