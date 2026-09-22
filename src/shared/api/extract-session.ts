import { extractBearerToken } from "@/features/auth/guard";
import { createAuthService } from "@/features/auth/service";

export async function extractSession(request: Request) {
  const token = extractBearerToken(request.headers);
  const authService = createAuthService();
  return await authService.getSession(token);
}
