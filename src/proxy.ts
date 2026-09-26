import { NextResponse, type NextRequest } from "next/server";

import { isPublicPath, isSignedInPath, returnToPath, signInPath, RETURN_TO_PARAM } from "@/constants/routes";
import { REFRESH_TOKEN_COOKIE } from "@/features/auth/cookies";

/**
 * Keeps signed-out visitors out of the app's screens and signed-in bakers off
 * the sign-in screen (plan §19). It decides on the presence of the session
 * cookie alone — it never reads the token or asks Supabase about it, because a
 * proxy runs on every request and is not where authorization belongs.
 *
 * Nothing here is a security control. Whether a request may actually see a row
 * is settled by the route guard and by RLS (AGENTS.md §7); this only spares a
 * visitor a screen that would have nothing to show them.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has(REFRESH_TOKEN_COOKIE);

  if (isPublicPath(pathname)) {
    if (!signedIn || isSignedInPath(pathname)) return NextResponse.next();

    const returnTo = returnToPath(request.nextUrl.searchParams.get(RETURN_TO_PARAM));
    return NextResponse.redirect(new URL(returnTo, request.url));
  }

  if (signedIn) return NextResponse.next();

  return NextResponse.redirect(new URL(signInPath(`${pathname}${search}`), request.url));
}

export const config = {
  /*
   * Everything but the API (which answers 401 itself and is called by more
   * than browsers), Next's own assets, the fonts the bill is drawn in, and
   * the metadata files.
   */
  matcher: ["/((?!api|_next/static|_next/image|fonts/|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml).*)"],
};
