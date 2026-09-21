import { withApiHandler, readJson } from "@/shared/api/handler";
import { createAuthService } from "@/modules/auth/auth.service";
import { passwordResetRequestSchema } from "@/modules/auth/auth.validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withApiHandler(request, async () => {
    const body = await readJson(request);
    const input = passwordResetRequestSchema.parse(body);

    return createAuthService().requestPasswordReset(input);
  });
}
