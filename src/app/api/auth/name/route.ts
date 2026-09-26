import { changeName } from "@/features/auth/account";
import { withAccountRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import { changeNameSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** The owner's name, once in 30 days (plan §139.10; the user, 2026-09-26). */
export async function PATCH(request: Request) {
  return withAccountRoute(request, async (context) =>
    changeName(context.admin, context, context.session.profile, await readJson(request, changeNameSchema)),
  );
}
