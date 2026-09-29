import { withApiHandler, type ApiContext } from "@/lib/api/handler";

import { toSessionView } from "./api";
import { clearedSessionCookies, sessionCookies, withSessionCookies, type SessionCookie } from "./cookies";
import type { AuthSessionView, AuthenticatedSession } from "./types";

/**
 * A route that hands back a session. Signing in, refreshing and confirming an
 * email all do the same two things — set the session cookies, and answer with
 * the part of the session the browser may see — so they do it through here and
 * none of them can accidentally return a token in the response body.
 */
export async function withSessionRoute(
  request: Request,
  resolve: (context: ApiContext) => Promise<AuthenticatedSession>,
  options: { successStatus?: number } = {},
) {
  const issued: SessionCookie[] = [];

  const response = await withApiHandler(
    request,
    async (context): Promise<AuthSessionView> => {
      const session = await resolve(context);
      issued.push(...sessionCookies(session));
      return toSessionView(session);
    },
    options,
  );

  return withSessionCookies(response, issued);
}

/**
 * A route that ends a session. The cookies are cleared whatever the handler
 * did: someone asking to be signed out is signed out, even if revoking the
 * token at Supabase failed.
 */
export async function withSignOutRoute<TData>(request: Request, handler: (context: ApiContext) => Promise<TData>) {
  const response = await withApiHandler(request, handler);
  return withSessionCookies(response, clearedSessionCookies());
}

/**
 * The answer of a route that ends the account itself — deleting it (R8.10).
 * The cookies are cleared once it is gone, and kept when it was refused, so a
 * mistyped password leaves the owner signed in to try again.
 */
export function endingSession(response: Response): Response {
  return response.ok ? withSessionCookies(response, clearedSessionCookies()) : response;
}
