import { extractBearerToken } from "@/modules/auth/auth.guard";
import { createAuthService } from "@/modules/auth/auth.service";

export async function extractSession(request: Request) {
  const token = extractBearerToken(request.headers);
  const authService = createAuthService();
  return await authService.getSession(token);
}
