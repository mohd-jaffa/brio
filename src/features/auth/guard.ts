import { ERROR_MESSAGES } from "@/constants/messages";
import { AuthenticationError, AuthorizationError } from "@/shared/errors/app-error";
import { createAuthService } from "@/features/auth/service";
import { USER_ROLES, type AuthProfile, type UserRole } from "@/features/auth/types";

export function extractBearerToken(headers: Headers) {
  const authorization = headers.get("authorization");

  if (!authorization) {
    throw new AuthenticationError("AUTH_SESSION_REQUIRED");
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new AuthenticationError("AUTH_SESSION_INVALID");
  }

  return token;
}

export function assertRole(profile: AuthProfile, allowedRoles: readonly UserRole[] = USER_ROLES) {
  if (!allowedRoles.includes(profile.role)) {
    throw new AuthorizationError("AUTH_ROLE_FORBIDDEN");
  }
}

export async function requireAuth(
  request: Request,
  allowedRoles: readonly UserRole[] = USER_ROLES,
) {
  const token = extractBearerToken(request.headers);
  const session = await createAuthService().getSession(token);

  assertRole(session.profile, allowedRoles);

  return session;
}
