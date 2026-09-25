import { resendConfirmation } from "@/features/auth/api";
import { requireAuth } from "@/features/auth/guard";
import { withApiHandler } from "@/lib/api/handler";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Queues the signed-in account's confirmation email again (plan §139.11.2,
 * BUG-16). The server role reads and writes the queue, which no signed-in
 * user may read.
 */
export async function POST(request: Request) {
  return withApiHandler(request, async () => {
    const session = await requireAuth(request);
    return resendConfirmation(createSupabaseServiceRoleClient(), session.profile);
  });
}
