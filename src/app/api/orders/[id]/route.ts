import { NextResponse } from "next/server";
import { withApiHandler } from "@/shared/api/handler";
import { extractSession } from "@/shared/api/extract-session";
import { OrdersService } from "@/features/orders/service";
import { createSupabaseAnonClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const { id } = await params;
    
    const supabase = createSupabaseAnonClient(session.accessToken);
    const service = new OrdersService(supabase);
    
    const order = await service.getOrderById(session.profile.bakeryId, id);
    return order;
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const { id } = await params;
    const body = await request.json();
    
    const supabase = createSupabaseAnonClient(session.accessToken);
    const service = new OrdersService(supabase);
    
    const order = await service.updateOrderStatus(session.profile.bakeryId, id, body);
    return order;
  });
}
