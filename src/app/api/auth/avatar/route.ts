import { changeAvatar } from "@/features/auth/account";
import { withAccountRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import { changeAvatarSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** The owner's profile picture, one of the nine that ship with the app (the user, 2026-09-27). */
export async function PATCH(request: Request) {
  return withAccountRoute(request, async (context) =>
    changeAvatar(context.admin, context, context.session.profile, await readJson(request, changeAvatarSchema)),
  );
}
