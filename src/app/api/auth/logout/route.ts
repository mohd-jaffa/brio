import { withApiHandler } from "@/shared/api/handler";
import { createAuthService } from "@/features/auth/service";
import { extractBearerToken } from "@/features/auth/guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withApiHandler(request, async () => {
    const accessToken = extractBearerToken(request.headers);

    return createAuthService().logout(accessToken);
  });
}
