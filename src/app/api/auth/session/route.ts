import { withApiHandler } from "@/shared/api/handler";
import { getSession } from "@/features/auth/api";
import { extractBearerToken } from "@/features/auth/guard";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiHandler(request, async () => {
    const accessToken = extractBearerToken(request.headers);
    const client = createSupabaseServiceRoleClient();
    return getSession(client, accessToken);
  });
}
