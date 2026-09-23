import { confirmEmail } from "@/features/auth/api";
import { withSessionRoute } from "@/features/auth/route";
import { readJson } from "@/lib/api/handler";
import { createSupabaseAnonClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { confirmEmailSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Where the link in the welcome email ends up (plan §7). The confirmation
 * screen hands over the tokens Supabase put in the URL; this records the
 * confirmation and signs the baker in, so the link lands them in the app.
 */
export async function POST(request: Request) {
  return withSessionRoute(request, async () =>
    confirmEmail(
      createSupabaseAnonClient(),
      createSupabaseServiceRoleClient(),
      await readJson(request, confirmEmailSchema),
    ),
  );
}
