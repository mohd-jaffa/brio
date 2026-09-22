import { withApiHandler } from "@/shared/api/handler";
import { extractSession } from "@/shared/api/extract-session";
import { getProductById, updateProduct } from "@/features/products/api";
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
    return getProductById(supabase, session.profile.bakeryId, id);
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
    return updateProduct(supabase, session.profile.bakeryId, id, body);
  });
}
