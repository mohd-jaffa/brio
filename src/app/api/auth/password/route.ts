import { changePassword } from "@/features/auth/api";
import { extractBearerToken } from "@/features/auth/guard";
import { readJson, withApiHandler } from "@/lib/api/handler";
import { createSupabaseAnonClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { changePasswordSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  return withApiHandler(request, async () =>
    changePassword(
      createSupabaseAnonClient(extractBearerToken(request.headers)),
      createSupabaseServiceRoleClient(),
      await readJson(request, changePasswordSchema),
    ),
  );
}
