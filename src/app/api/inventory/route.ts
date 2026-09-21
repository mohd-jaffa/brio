import { NextResponse } from "next/server";
import { withApiHandler } from "@/shared/api/handler";
import { extractSession } from "@/shared/api/extract-session";
import { InventoryService } from "@/modules/inventory/inventory.service";
import { createSupabaseAnonClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const body = await request.json();
    
    const supabase = createSupabaseAnonClient(session.accessToken);
    const service = new InventoryService(supabase);
    
    const transaction = await service.logTransaction(session.profile.bakeryId, body);
    return transaction;
  });
}
