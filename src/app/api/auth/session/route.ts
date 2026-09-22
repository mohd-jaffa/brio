import { withApiHandler } from "@/shared/api/handler";
import { createAuthService } from "@/features/auth/service";
import { extractBearerToken } from "@/features/auth/guard";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiHandler(request, async () => {
    const accessToken = extractBearerToken(request.headers);
    return createAuthService().getSession(accessToken);
  });
}
