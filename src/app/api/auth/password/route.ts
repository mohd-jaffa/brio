import { changePassword } from "@/features/auth/api";
import { readAccessToken } from "@/features/auth/guard";
import { readJson, withApiHandler } from "@/lib/api/handler";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { changePasswordSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Replaces the caller's own password (plan §95). Deliberately outside
 * `withBakeryRoute`: a baker owing a forced password change is refused
 * everywhere else, and this is the one door that has to stay open to them.
 */
export async function PATCH(request: Request) {
  return withApiHandler(request, async () =>
    changePassword(
      createSupabaseServiceRoleClient(),
      readAccessToken(request),
      await readJson(request, changePasswordSchema),
    ),
  );
}
