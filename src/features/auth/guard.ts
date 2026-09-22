import { withApiHandler, type ApiContext } from "@/lib/api/handler";
import { authenticationError, authorizationError } from "@/lib/errors";
import { createSupabaseAnonClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSession } from "./api";
import { USER_ROLES, type AuthProfile, type AuthenticatedSession, type UserRole } from "./types";

/** The bearer token on a request, or the reason there is no usable one. */
export function extractBearerToken(headers: Headers): string {
  const authorization = headers.get("authorization");
  if (!authorization) throw authenticationError("AUTH_SESSION_REQUIRED");

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) throw authenticationError("AUTH_SESSION_INVALID");

  return token;
}

export function assertRole(profile: AuthProfile, allowedRoles: readonly UserRole[] = USER_ROLES) {
  if (!allowedRoles.includes(profile.role)) throw authorizationError("AUTH_ROLE_FORBIDDEN");
}

/** The session behind a request, refused when there is none or the role may not act. */
export async function requireAuth(
  request: Request,
  allowedRoles: readonly UserRole[] = USER_ROLES,
): Promise<AuthenticatedSession> {
  const token = extractBearerToken(request.headers);
  const session = await getSession(createSupabaseServiceRoleClient(), token);
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
 * session, checks the role, and builds a Supabase client that carries the
 * caller's token — so tenant isolation is enforced by RLS rather than by each
 * route remembering to filter. Every such route goes through here; none builds
 * a service-role client of its own to serve a request.
 */
export function withBakeryRoute<TData>(
  request: Request,
  handler: (context: BakeryContext) => Promise<TData>,
  options: { successStatus?: number; roles?: readonly UserRole[] } = {},
) {
  return withApiHandler(
    request,
    async ({ requestId }) => {
      const session = await requireAuth(request, options.roles);
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
