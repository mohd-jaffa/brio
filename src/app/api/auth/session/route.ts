import { withApiHandler } from "@/shared/api/handler";
import { createAuthService } from "@/modules/auth/auth.service";
import { extractBearerToken } from "@/modules/auth/auth.guard";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiHandler(request, async () => {
    const accessToken = extractBearerToken(request.headers);
    return createAuthService().getSession(accessToken);
  });
}
