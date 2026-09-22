import { logout } from "@/features/auth/api";
import { withApiHandler } from "@/lib/api/handler";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withApiHandler(request, async () => logout(createSupabaseServiceRoleClient()));
}
