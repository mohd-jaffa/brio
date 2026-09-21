import { withApiHandler } from "@/shared/api/handler";
import { requireAuth } from "@/modules/auth/auth.guard";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiHandler(request, async () => requireAuth(request));
}
