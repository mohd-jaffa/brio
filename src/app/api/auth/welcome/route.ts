import { markWelcomed } from "@/features/auth/account";
import { withAccountRoute } from "@/features/auth/guard";

export const runtime = "nodejs";

/** The welcome finished or skipped, once for each new account (plan §139.11.20). */
export async function POST(request: Request) {
  return withAccountRoute(request, async (context) => markWelcomed(context.admin, context.session.profile));
}
