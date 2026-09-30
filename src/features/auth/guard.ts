import type { SupabaseClient } from "@supabase/supabase-js";

import { BUSINESS_ROLES, DEVELOPER_ROLES, type UserRole } from "@/constants/roles";
import { withApiHandler, type ApiContext } from "@/lib/api/handler";
import { authenticationError, authorizationError } from "@/lib/errors";
import { createSupabaseAnonClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { Tenant } from "@/lib/supabase/tenant";

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
 * The business an owner acts for. Every owner has one (0028's check), so a
 * profile without one here can only be one the route should not serve.
 */
export function businessOf(profile: AuthProfile): string {
  if (!profile.bakeryId) throw authorizationError("AUTH_ROLE_FORBIDDEN");
  return profile.bakeryId;
}

/**
 * A baker holding a temporary password reaches nothing but the screen that
 * replaces it (plan §95). Enforced on the server as well as in the browser,
 * because hiding the rest of the app is a courtesy, not a control.
 */
export function assertPasswordChanged(session: AuthenticatedSession) {
  if (session.requiresPasswordChange) throw authorizationError("AUTH_PASSWORD_CHANGE_REQUIRED");
}

/** Who is asking, for the error log should the request fail. */
function askerOf(session: AuthenticatedSession): NonNullable<ApiContext["asker"]> {
  return { userId: session.profile.id, bakeryId: session.profile.bakeryId };
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

/**
 * What a tenant-scoped route is handed: who is asking, and a client that can
 * only see their business. It is a `Tenant`, so it goes straight to a
 * feature's data functions, which record its actor on every audit row.
 */
export interface BakeryContext extends ApiContext, Tenant {
  session: AuthenticatedSession;
}

/**
 * A route that acts on one bakery's data (AGENTS.md §7). It resolves the
 * session, checks the role, refuses anyone who still has to replace a
 * temporary password, and builds a Supabase client that carries the caller's
 * token — so tenant isolation is enforced by RLS rather than by each route
 * remembering to filter. Every such route goes through here; none builds a
 * service-role client of its own to serve a request. The audit trail is the
 * one write the server makes itself (src/lib/audit, BUG-20).
 */
export function withBakeryRoute<TData>(
  request: Request,
  handler: (context: BakeryContext) => Promise<TData>,
  options: { successStatus?: number; roles?: readonly UserRole[] } = {},
) {
  return withApiHandler(
    request,
    async (api) => {
      const session = await requireAuth(request, options.roles ?? BUSINESS_ROLES);
      api.asker = askerOf(session);
      assertPasswordChanged(session);
      return handler({
        requestId: api.requestId,
        session,
        supabase: createSupabaseAnonClient(session.accessToken),
        bakeryId: businessOf(session.profile),
        actorId: session.profile.id,
      });
    },
    { successStatus: options.successStatus },
  );
}

/** What a route that changes the owner's own account is handed: the tenant, and the server's client. */
export interface AccountContext extends BakeryContext {
  admin: SupabaseClient;
}

/**
 * A route that changes the signed-in owner's own account — the name, the
 * sign-in number, the email (plan §139.10; the user, 2026-09-26). Like
 * `withBakeryRoute` it resolves the session and refuses anyone still owing a
 * password change; and since Auth and `profiles` are written by the server
 * only (0008), it also hands over the service role, which the account
 * functions use on the session's own account and nothing else.
 */
export function withAccountRoute<TData>(request: Request, handler: (context: AccountContext) => Promise<TData>) {
  return withApiHandler(request, async (api) => {
    const session = await requireAuth(request);
    api.asker = askerOf(session);
    assertPasswordChanged(session);
    return handler({
      requestId: api.requestId,
      session,
      supabase: createSupabaseAnonClient(session.accessToken),
      bakeryId: businessOf(session.profile),
      actorId: session.profile.id,
      admin: createSupabaseServiceRoleClient(),
    });
  });
}

/** What a developer console route is handed: who is asking, and the server's client, to read with. */
export interface DeveloperContext extends ApiContext {
  session: AuthenticatedSession;
  admin: SupabaseClient;
}

/**
 * A route of the developer console (plan §5, §37): DEV and only DEV, and
 * never one still owing a password change. The console reads across every
 * business — the accounts, the audit trail, the job queue — so it reads as
 * the server, and the rule that decides who may is this guard. Every such
 * read is a fixed, read-only query in `src/features/admin/api.ts`; nothing a
 * console route does writes (the user, 2026-09-27).
 */
export function withDevRoute<TData>(request: Request, handler: (context: DeveloperContext) => Promise<TData>) {
  return withApiHandler(request, async (api) => {
    const session = await requireAuth(request, DEVELOPER_ROLES);
    api.asker = askerOf(session);
    assertPasswordChanged(session);
    return handler({ requestId: api.requestId, session, admin: createSupabaseServiceRoleClient() });
  });
}
