import { withApiHandler } from "@/shared/api/handler";
import { extractSession } from "@/shared/api/extract-session";
import { createOrder } from "@/features/orders/checkout";
import { getAllOrders } from "@/features/orders/queries";
import { createSupabaseAnonClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const supabase = createSupabaseAnonClient(session.accessToken);
    return getAllOrders(supabase, session.profile.bakeryId);
  });
}

export async function POST(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const body = await request.json();
    const supabase = createSupabaseAnonClient(session.accessToken);
    return createOrder(supabase, session.profile.bakeryId, body);
  });
}
