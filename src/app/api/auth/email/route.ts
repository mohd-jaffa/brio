import { requestEmailChange } from "@/features/auth/account";
import { withAccountRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import { changeEmailSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * A new email address, with the current password, once in 30 days (the user,
 * 2026-09-26). It waits for the link sent to it; the current one stays in use
 * until then.
 */
export async function POST(request: Request) {
  return withAccountRoute(request, async (context) =>
    requestEmailChange(context.admin, context, context.session.profile, await readJson(request, changeEmailSchema)),
  );
}
