import type { SupabaseClient } from "@supabase/supabase-js";

import { BUSINESS_ROLES, type UserRole } from "@/constants/roles";
import { withApiHandler, type ApiContext } from "@/lib/api/handler";
import { authenticationError, authorizationError } from "@/lib/errors";
import { createSupabaseAnonClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

import { readAccessTokenCookie } from "./cookies";
import { getSession } from "./api";
import type { AuthProfile, AuthenticatedSession } from "./types";

/** The token in an `Authorization: Bearer` header, or null when there is none. */
export function bearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

/**
 * The access token behind a request. The browser sends it as an HttpOnly
 * cookie; a script, a test or a native client may send it as a bearer header
 * instead. Both are accepted here so no route has to know which it is looking
 * at, and a request carrying neither is refused before it reaches any data.
 */
export function readAccessToken(request: Request): string {
  const token = bearerToken(request.headers) ?? readAccessTokenCookie(request.headers);
  if (!token) throw authenticationError("AUTH_SESSION_REQUIRED");
  return token;
}

/**
 * Whether this role may act here. There is deliberately no default: a route
 * says which roles it serves, because a guard that allows everyone unless told
 * otherwise is not a guard (plan §5, AGENTS.md §21).
 */
export function assertRole(profile: AuthProfile, allowedRoles: readonly UserRole[]) {
  if (!allowedRoles.includes(profile.role)) throw authorizationError("AUTH_ROLE_FORBIDDEN");
}

/**
 * A baker holding a temporary password reaches nothing but the screen that
 * replaces it (plan §95). Enforced on the server as well as in the browser,
 * because hiding the rest of the app is a courtesy, not a control.
 */
export function assertPasswordChanged(session: AuthenticatedSession) {
  if (session.requiresPasswordChange) throw authorizationError("AUTH_PASSWORD_CHANGE_REQUIRED");
}

/** The session behind a request, refused when there is none or the role may not act. */
export async function requireAuth(
  request: Request,
  allowedRoles: readonly UserRole[] = BUSINESS_ROLES,
): Promise<AuthenticatedSession> {
  const session = await getSession(createSupabaseServiceRoleClient(), readAccessToken(request));
  assertRole(session.profile, allowedRoles);
  return session;
}

/** What a tenant-scoped route is handed: who is asking, and a client that can only see their bakery. */
export interface BakeryContext extends ApiContext {
  session: AuthenticatedSession;
  /** Carries the caller's token, so every read and write runs under their RLS policies. */
  supabase: SupabaseClient;
  bakeryId: string;
}

/**
 * A route that acts on one bakery's data (AGENTS.md §7). It resolves the
 * session, checks the role, refuses anyone who still has to replace a
 * temporary password, and builds a Supabase client that carries the caller's
 * token — so tenant isolation is enforced by RLS rather than by each route
 * remembering to filter. Every such route goes through here; none builds a
 * service-role client of its own to serve a request.
 */
export function withBakeryRoute<TData>(
  request: Request,
  handler: (context: BakeryContext) => Promise<TData>,
  options: { successStatus?: number; roles?: readonly UserRole[] } = {},
) {
  return withApiHandler(
    request,
    async ({ requestId }) => {
      const session = await requireAuth(request, options.roles ?? BUSINESS_ROLES);
      assertPasswordChanged(session);
      return handler({
        requestId,
        session,
        supabase: createSupabaseAnonClient(session.accessToken),
        bakeryId: session.profile.bakeryId,
      });
    },
    { successStatus: options.successStatus },
  );
}
