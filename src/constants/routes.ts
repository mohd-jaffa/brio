/**
 * The screens that exist before anyone has signed in, and the rules about who
 * may see what. Kept apart from src/constants/navigation.ts because the proxy
 * reads this on every request and must not pull the navigation's icons in
 * with it.
 */
export const AUTH_ROUTES = {
  signIn: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  changePassword: "/change-password",
  confirmEmail: "/confirm-email",
} as const;

/** Where a signed-in baker lands when they have nowhere particular to go. */
export const HOME_ROUTE = "/";

/** Carries the screen someone was trying to reach through the sign-in detour. */
export const RETURN_TO_PARAM = "next";

/** Reachable without a session. */
const PUBLIC_PATHS: readonly string[] = [
  AUTH_ROUTES.signIn,
  AUTH_ROUTES.register,
  AUTH_ROUTES.forgotPassword,
  AUTH_ROUTES.confirmEmail,
];

/**
 * Reachable while signed in but still owing a password change, and therefore
 * not somewhere a signed-in baker should be bounced away from (plan §95).
 */
const SESSION_PATHS: readonly string[] = [AUTH_ROUTES.changePassword, AUTH_ROUTES.confirmEmail];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

/** Whether a signed-in baker has any business being here. */
export function isSignedInPath(pathname: string): boolean {
  return SESSION_PATHS.includes(pathname);
}

/** The sign-in URL, remembering where the visitor was heading. */
export function signInPath(returnTo?: string | null): string {
  if (!returnTo || returnTo === HOME_ROUTE) return AUTH_ROUTES.signIn;
  return `${AUTH_ROUTES.signIn}?${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`;
}

/**
 * Where to go after signing in. Only a path within the app is accepted: a
 * `next` of `https://elsewhere.example` would otherwise turn sign-in into an
 * open redirect.
 */
export function returnToPath(returnTo: string | null | undefined): string {
  if (!returnTo) return HOME_ROUTE;
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return HOME_ROUTE;
  if (isPublicPath(returnTo.split("?")[0])) return HOME_ROUTE;
  return returnTo;
}
