import { fetcher } from "@/shared/api/client";
import { type LogInventoryTransactionInput } from "@/lib/validation";

export const InventoryClient = {
  async adjustStock(payload: LogInventoryTransactionInput): Promise<{ id: string }> {
    return fetcher<{ id: string }>("/api/inventory", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
