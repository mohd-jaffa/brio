import { withApiHandler, readJson } from "@/shared/api/handler";
import { createAuthService } from "@/features/auth/service";
import { extractBearerToken } from "@/features/auth/guard";
import { changePasswordSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  return withApiHandler(request, async () => {
    const accessToken = extractBearerToken(request.headers);
    const body = await readJson(request);
    const input = changePasswordSchema.parse(body);

    return createAuthService().changePassword(accessToken, input);
  });
}
