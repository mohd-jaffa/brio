import { requestPasswordReset } from "@/features/auth/api";
import { readJson, withApiHandler } from "@/lib/api/handler";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { passwordResetRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withApiHandler(request, async () =>
    requestPasswordReset(createSupabaseServiceRoleClient(), await readJson(request, passwordResetRequestSchema)),
  );
}
