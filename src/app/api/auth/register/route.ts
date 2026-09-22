import { withApiHandler, readJson } from "@/shared/api/handler";
import { register } from "@/features/auth/api";
import { registerSchema } from "@/lib/validation";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withApiHandler(
    request,
    async () => {
      const body = await readJson(request);
      const input = registerSchema.parse(body);
      const client = createSupabaseServiceRoleClient();
      return register(client, input);
    },
    { successStatus: 201 },
  );
}
