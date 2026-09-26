import { changePhone } from "@/features/auth/account";
import { withAccountRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import { changePhoneSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** The sign-in number, with the current password, once in 30 days (the user, 2026-09-26). */
export async function PATCH(request: Request) {
  return withAccountRoute(request, async (context) =>
    changePhone(context.admin, context, context.session.profile, await readJson(request, changePhoneSchema)),
  );
}
