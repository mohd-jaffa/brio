import { withApiHandler } from "@/shared/api/handler";
import { extractSession } from "@/shared/api/extract-session";
import { logInventoryTransaction } from "@/features/inventory/api";
import { createSupabaseAnonClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const body = await request.json();
    const supabase = createSupabaseAnonClient(session.accessToken);
    return logInventoryTransaction(supabase, session.profile.bakeryId, body);
  });
}
