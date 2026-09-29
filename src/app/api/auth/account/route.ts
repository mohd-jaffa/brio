import { deleteAccount } from "@/features/auth/account";
import { withAccountRoute } from "@/features/auth/guard";
import { endingSession } from "@/features/auth/route";
import { readJson } from "@/lib/api/handler";
import { deleteAccountSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * The owner's account and everything of their business, deleted for good
 * (plan §139.17.5, R8.10): with the account's sign-in number and email typed
 * out, and the password twice. The session ends with it.
 */
export async function DELETE(request: Request) {
  return endingSession(
    await withAccountRoute(request, async (context) =>
      deleteAccount(context.admin, context.session.profile, await readJson(request, deleteAccountSchema)),
    ),
  );
}
