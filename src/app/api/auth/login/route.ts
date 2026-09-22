import { withApiHandler, readJson } from "@/shared/api/handler";
import { login } from "@/features/auth/api";
import { loginSchema } from "@/lib/validation";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withApiHandler(request, async () => {
    const body = await readJson(request);
    const input = loginSchema.parse(body);
    const client = createSupabaseServiceRoleClient();
    return login(client, input);
  });
}
