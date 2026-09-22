import { withApiHandler, readJson } from "@/shared/api/handler";
import { changePassword } from "@/features/auth/api";
import { extractBearerToken } from "@/features/auth/guard";
import { changePasswordSchema } from "@/lib/validation";
import { createSupabaseAnonClient, createSupabaseServiceRoleClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  return withApiHandler(request, async () => {
    const accessToken = extractBearerToken(request.headers);
    const body = await readJson(request);
    const input = changePasswordSchema.parse(body);
    const userClient = createSupabaseAnonClient(accessToken);
    const adminClient = createSupabaseServiceRoleClient();
    return changePassword(userClient, adminClient, input);
  });
}
