import { getSession } from "@/features/auth/api";
import { extractBearerToken } from "@/features/auth/guard";
import { withApiHandler } from "@/lib/api/handler";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiHandler(request, async () =>
    getSession(createSupabaseServiceRoleClient(), extractBearerToken(request.headers)),
  );
}
