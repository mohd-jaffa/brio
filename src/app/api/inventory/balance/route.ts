import { getInventoryBalances } from "@/features/inventory/api";
import { withBakeryRoute } from "@/features/auth/guard";
import { listParam } from "@/lib/api/params";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, ({ supabase, bakeryId }) =>
    getInventoryBalances(supabase, bakeryId, listParam(request, "products")),
  );
}
