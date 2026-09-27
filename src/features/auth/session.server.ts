import { cookies } from "next/headers";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

import { getSession, toSessionView } from "./api";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./cookies";
import type { AuthSessionView } from "./types";

/**
 * What the server already knows of the session as it draws a page, so the
 * browser need not ask before it can show anything:
 *
 * - **null** — signed out: no session cookie at all, so there is nothing to
 *   check and nothing to refuse.
 * - **the session** — its access token is good: the screen is drawn signed in,
 *   in the page's own HTML.
 * - **undefined** — not settled here: the access token has expired or was
 *   refused. The browser settles it, because a refresh sets new cookies and
 *   only a route handler may set them.
 *
 * Like the proxy, this decides nothing about access; the API and RLS do.
 */
export async function readInitialSession(): Promise<AuthSessionView | null | undefined> {
  const jar = await cookies();
  const accessToken = jar.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return jar.has(REFRESH_TOKEN_COOKIE) ? undefined : null;

  try {
    return toSessionView(await getSession(createSupabaseServiceRoleClient(), accessToken));
  } catch {
    return undefined;
  }
}
