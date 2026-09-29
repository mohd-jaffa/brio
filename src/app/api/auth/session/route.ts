import { getSession, toSessionView } from "@/features/auth/api";
import { readAccessToken } from "@/features/auth/guard";
import { withApiHandler } from "@/lib/api/handler";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Who is signed in. Answers with the profile and whether a password change is
 * owed — never with a token, which stays in the HttpOnly cookies (AGENTS.md §9).
 */
export async function GET(request: Request) {
  return withApiHandler(request, async () =>
    toSessionView(await getSession(createSupabaseServiceRoleClient(), readAccessToken(request))),
  );
}
