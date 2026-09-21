import { NextResponse } from "next/server";
import { withApiHandler } from "@/shared/api/handler";
import { extractSession } from "@/shared/api/extract-session";
import { OrdersService } from "@/modules/orders/orders.service";
import { createSupabaseAnonClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    
    const supabase = createSupabaseAnonClient(session.accessToken);
    const service = new OrdersService(supabase);
    
    const orders = await service.getAllOrders(session.profile.bakeryId);
    return orders;
  });
}

export async function POST(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const body = await request.json();
    
    const supabase = createSupabaseAnonClient(session.accessToken);
    const service = new OrdersService(supabase);
    
    const order = await service.createOrder(session.profile.bakeryId, body);
    return order;
  });
}
