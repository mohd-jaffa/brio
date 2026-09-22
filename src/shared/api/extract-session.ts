import { extractBearerToken } from "@/features/auth/guard";
import { getSession } from "@/features/auth/api";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/server";

export async function extractSession(request: Request) {
  const token = extractBearerToken(request.headers);
  const client = createSupabaseServiceRoleClient();
  return getSession(client, token);
}
