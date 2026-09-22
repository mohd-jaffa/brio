import { register } from "@/features/auth/api";
import { readJson, withApiHandler } from "@/lib/api/handler";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withApiHandler(
    request,
    async () => register(createSupabaseServiceRoleClient(), await readJson(request, registerSchema)),
    { successStatus: 201 },
  );
}
