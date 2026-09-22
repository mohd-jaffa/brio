import { withApiHandler, readJson } from "@/shared/api/handler";
import { requestPasswordReset } from "@/features/auth/api";
import { passwordResetRequestSchema } from "@/lib/validation";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withApiHandler(request, async () => {
    const body = await readJson(request);
    const input = passwordResetRequestSchema.parse(body);
    const client = createSupabaseServiceRoleClient();
    return requestPasswordReset(client, input);
  });
}
