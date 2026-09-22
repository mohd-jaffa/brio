import { logInventoryTransaction } from "@/features/inventory/api";
import { withBakeryRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import { logInventoryTransactionSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withBakeryRoute(
    request,
    async ({ supabase, bakeryId }) => logInventoryTransaction(supabase, bakeryId, await readJson(request, logInventoryTransactionSchema)),
    { successStatus: 201 },
  );
}
