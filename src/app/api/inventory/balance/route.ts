import { withApiHandler } from "@/shared/api/handler";
import { extractSession } from "@/shared/api/extract-session";
import { getInventoryBalances } from "@/features/inventory/api";
import { createSupabaseAnonClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const { searchParams } = new URL(request.url);
    const products = searchParams.get("products");
    const productIds = products ? products.split(",") : undefined;
    const supabase = createSupabaseAnonClient(session.accessToken);
    return getInventoryBalances(supabase, session.profile.bakeryId, productIds);
  });
}
