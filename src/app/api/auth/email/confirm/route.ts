import { confirmEmailChange } from "@/features/auth/account";
import { readJson, withApiHandler } from "@/lib/api/handler";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { confirmEmailChangeSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * The link sent to a new email address was followed (the user, 2026-09-26).
 * Holding its token proves the address is theirs, so no session is needed:
 * the link may be opened on any device.
 */
export async function POST(request: Request) {
  return withApiHandler(request, async () =>
    confirmEmailChange(createSupabaseServiceRoleClient(), await readJson(request, confirmEmailChangeSchema)),
  );
}
