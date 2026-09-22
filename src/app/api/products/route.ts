import { withApiHandler } from "@/shared/api/handler";
import { extractSession } from "@/shared/api/extract-session";
import { getAllProducts, createProduct } from "@/features/products/api";
import { createSupabaseAnonClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const supabase = createSupabaseAnonClient(session.accessToken);
    return getAllProducts(supabase, session.profile.bakeryId);
  });
}

export async function POST(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const body = await request.json();
    const supabase = createSupabaseAnonClient(session.accessToken);
    return createProduct(supabase, session.profile.bakeryId, body);
  });
}
