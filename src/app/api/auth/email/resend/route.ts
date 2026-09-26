import { resendEmailChange } from "@/features/auth/account";
import { withAccountRoute } from "@/features/auth/guard";

export const runtime = "nodejs";

/** Sends the new email address its link again. */
export async function POST(request: Request) {
  return withAccountRoute(request, async (context) => resendEmailChange(context.admin, context.session.profile));
}
