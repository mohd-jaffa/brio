import { withApiHandler } from "@/shared/api/handler";
import { logout } from "@/features/auth/api";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withApiHandler(request, async () => {
    const client = createSupabaseServiceRoleClient();
    return logout(client);
  });
}
