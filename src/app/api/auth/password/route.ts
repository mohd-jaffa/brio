import { withApiHandler, readJson } from "@/shared/api/handler";
import { createAuthService } from "@/modules/auth/auth.service";
import { extractBearerToken } from "@/modules/auth/auth.guard";
import { changePasswordSchema } from "@/modules/auth/auth.validation";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  return withApiHandler(request, async () => {
    const accessToken = extractBearerToken(request.headers);
    const body = await readJson(request);
    const input = changePasswordSchema.parse(body);

    return createAuthService().changePassword(accessToken, input);
  });
}
