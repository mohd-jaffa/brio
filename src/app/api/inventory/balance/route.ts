import { NextResponse } from "next/server";
import { withApiHandler } from "@/shared/api/handler";
import { extractSession } from "@/shared/api/extract-session";
import { InventoryService } from "@/features/inventory/service";
import { createSupabaseAnonClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    
    const { searchParams } = new URL(request.url);
    const products = searchParams.get("products");
    const productIds = products ? products.split(",") : undefined;

    const supabase = createSupabaseAnonClient(session.accessToken);
    const service = new InventoryService(supabase);
    
    const balances = await service.getBalances(session.profile.bakeryId, productIds);
    return balances;
  });
}
