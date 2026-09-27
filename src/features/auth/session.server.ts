import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { BUSINESS_ROLES } from "@/constants/roles";
import { AUTH_ROUTES } from "@/constants/routes";
import { logger } from "@/lib/logger";
import { createSupabaseAnonClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { Tenant } from "@/lib/supabase/tenant";

import { getSession, toSessionView } from "./api";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./cookies";
import type { AuthenticatedSession, AuthSessionView } from "./types";

/**
 * The session behind the request being drawn, read once however many parts of
 * the page ask — the layout for who is signed in, the page for its first
 * data — and forgotten when the request ends:
 *
 * - **null** — signed out: no session cookie at all.
 * - **the session** — its access token is good.
 * - **undefined** — not settled here: the token was refused, or there is only
 *   a refresh cookie the proxy could not use. The browser settles it.
 *
 * Like the proxy, this decides nothing about access; the API and RLS do.
 */
const readServerSession = cache(async (): Promise<AuthenticatedSession | null | undefined> => {
  const jar = await cookies();
  const accessToken = jar.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return jar.has(REFRESH_TOKEN_COOKIE) ? undefined : null;

  try {
    return await getSession(createSupabaseServiceRoleClient(), accessToken);
  } catch {
    return undefined;
  }
});

/**
 * What the page arrives knowing of the session, for `AuthProvider`: the part
 * the browser may see — never a token — null for signed out, or undefined
 * when only the browser can settle it.
 */
export async function readInitialSession(): Promise<AuthSessionView | null | undefined> {
  const session = await readServerSession();
  return session ? toSessionView(session) : session;
}

/** A read of one screen's first data, made as its API route would make it. */
export type ScreenRead = (tenant: Tenant) => Promise<unknown>;

/** The first data a screen shows, keyed as its hooks ask for it (`ServerData`). */
export interface ScreenData {
  queries: Record<string, unknown>;
  pages: Record<string, unknown>;
}

const NOTHING: ScreenData = { queries: {}, pages: {} };

/**
 * A screen's first data, read on the server as the page is drawn, so it
 * arrives with the page instead of after it: each read is the one its API
 * route makes, for the same business, under the same RLS, and comes back in
 * the shape the route would have sent (JSON), keyed by the route the screen's
 * hook asks for.
 *
 * - An owner still holding a temporary password is sent to replace it here,
 *   before anything is drawn (plan §95).
 * - Anyone else the business routes would refuse gets nothing read, and the
 *   screen asks for itself as before, so the API gives the answer.
 * - A read that fails is left out and logged; its screen asks for it, and
 *   shows its own error if it fails again.
 *
 * `queries` feed `useApiQuery`; `pages` feed the first page of `useApiPages`.
 */
export async function readScreen(reads: {
  queries?: Record<string, ScreenRead>;
  pages?: Record<string, ScreenRead>;
}): Promise<ScreenData> {
  const session = await readServerSession();
  if (!session) return NOTHING;
  if (session.requiresPasswordChange) redirect(AUTH_ROUTES.changePassword);
  if (!BUSINESS_ROLES.includes(session.profile.role)) return NOTHING;

  const tenant: Tenant = {
    supabase: createSupabaseAnonClient(session.accessToken),
    bakeryId: session.profile.bakeryId,
    actorId: session.profile.id,
  };

  const readAll = async (group: Record<string, ScreenRead> = {}) => {
    const entries = await Promise.all(
      Object.entries(group).map(async ([key, read]) => {
        try {
          // Exactly what the route would have sent: dates as strings, nothing undefined.
          return [key, JSON.parse(JSON.stringify(await read(tenant)))] as const;
        } catch (failure) {
          logger.warn("A screen's first data was not read on the server; the browser will ask", {
            route: key,
            reason: failure instanceof Error ? failure.name : "unknown",
          });
          return null;
        }
      }),
    );
    return Object.fromEntries(entries.filter((entry) => entry !== null));
  };

  const [queries, pages] = await Promise.all([readAll(reads.queries), readAll(reads.pages)]);
  return { queries, pages };
}

/**
 * The query a route reads from `key` — its own URL — parsed by its own schema,
 * as `readQuery` does for the request: so a screen's first data is asked for
 * exactly as its hook would ask the route.
 */
export function routeQuery<T>(key: string, schema: { parse: (values: Record<string, string>) => T }): T {
  const values: Record<string, string> = {};
  for (const [name, value] of new URL(key, "http://route").searchParams) {
    if (value !== "" && !(name in values)) values[name] = value;
  }
  return schema.parse(values);
}
