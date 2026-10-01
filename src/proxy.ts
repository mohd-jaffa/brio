import { NextResponse, type NextRequest } from "next/server";

import { isPublicPath, isSignedInPath, returnToPath, signInPath, RETURN_TO_PARAM } from "@/constants/routes";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/features/auth/cookies";
import { renewSession } from "@/features/auth/renew";

/**
 * Keeps signed-out visitors out of the app's screens and signed-in bakers off
 * the sign-in screen (plan §19). It decides on the presence of the session
 * cookie alone — it never reads the token, because a proxy runs on every
 * request and is not where authorization belongs.
 *
 * One thing more: a screen asked for once the access token has run out (its
 * cookie expires with it) has the session renewed first (`renewSession`), so
 * the server can draw the screen signed in, with its data. That asks Supabase
 * at most once an hour.
 *
 * Nothing here is a security control. Whether a request may actually see a row
 * is settled by the route guard and by RLS (AGENTS.md §7); this only spares a
 * visitor a screen that would have nothing to show them.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const signedIn = Boolean(refreshToken);

  if (isPublicPath(pathname)) {
    if (!signedIn || isSignedInPath(pathname)) return NextResponse.next();

    const returnTo = returnToPath(request.nextUrl.searchParams.get(RETURN_TO_PARAM));
    return NextResponse.redirect(new URL(returnTo, request.url));
  }

  if (!refreshToken) return NextResponse.redirect(new URL(signInPath(`${pathname}${search}`), request.url));
  if (!request.cookies.has(ACCESS_TOKEN_COOKIE)) return renewSession(request, refreshToken);
  return NextResponse.next();
}

export const config = {
  /*
   * Everything but the API (which answers 401 itself and is called by more
   * than browsers), Next's own assets, the fonts the bill is drawn in, the
   * metadata files, and what the installed app needs signed in or not: its
   * icons, its service worker and its offline page (plan §139.19 R7); the
   * privacy policy and the landing page at the site's root, which anyone may
   * read (R8.10, §139.11.22); the pictures a shared link and an email show,
   * which are fetched with no session (`opengraph-image`, `twitter-image`,
   * `email/`); and `/.well-known/`, which Android reads for App Links and
   * which must answer without a redirect (R8.5).
   */
  matcher: [
    "/((?!$|api|_next/static|_next/image|fonts/|icons/|email/|favicon.ico|apple-icon.png|opengraph-image|twitter-image|manifest.webmanifest|sw.js|offline|privacy|\\.well-known/|robots.txt|sitemap.xml).*)",
  ],
};
