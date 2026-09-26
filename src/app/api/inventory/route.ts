import { withBakeryRoute } from "@/features/auth/guard";
import { listStockMovements, logInventoryTransaction } from "@/features/inventory/api";
import { readJson, readQuery } from "@/lib/api/handler";
import { logInventoryTransactionSchema, stockLedgerQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

/** One product's ledger, newest first: `?product={id}&cursor=`. */
export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => listStockMovements(tenant, readQuery(request, stockLedgerQuerySchema)));
}

export async function POST(request: Request) {
  return withBakeryRoute(
    request,
    async (tenant) => logInventoryTransaction(tenant, await readJson(request, logInventoryTransactionSchema)),
    { successStatus: 201 },
  );
}
