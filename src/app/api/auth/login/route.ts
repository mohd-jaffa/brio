import { login } from "@/features/auth/api";
import { withSessionRoute } from "@/features/auth/route";
import { readJson } from "@/lib/api/handler";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withSessionRoute(request, async () =>
    login(createSupabaseServiceRoleClient(), await readJson(request, loginSchema)),
  );
}
