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

/**
 * Where a signed-in owner lands when they have nowhere particular to go: Home,
 * the dashboard. The site's root is the landing page (LANDING_ROUTE; the user,
 * 2026-10-01).
 */
export const HOME_ROUTE = "/home";

/**
 * The privacy policy (plan §139.17.5, R8.10): open to anyone, signed in or
 * not — Google Play links to it — so the proxy does not run for it.
 */
export const PRIVACY_ROUTE = "/privacy";

/**
 * The landing page (plan §139.11.22): what Brio is, for anyone, signed in or
 * not, at the site's root, so the proxy does not run for it either. `/about`,
 * its first address, leads here.
 */
export const LANDING_ROUTE = "/";

/** Where an owner deletes their account; the privacy policy links here for the web. */
export const DELETE_ACCOUNT_ROUTE = "/settings/delete-account";

/** Tells the sign-in screen an account was just deleted, so it can say so. */
export const ACCOUNT_DELETED_PARAM = "deleted";

/** The developer console's pages (plan §37): DEV only. */
export const ADMIN_ROUTES = {
  overview: "/admin",
  users: "/admin/users",
  logs: "/admin/logs",
  audit: "/admin/audit",
} as const;

/** Where a developer lands instead of Home: a developer has no business. */
export const ADMIN_ROUTE = ADMIN_ROUTES.overview;

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

/** The sign-in screen after an account has been deleted. */
export function accountDeletedPath(): string {
  return `${AUTH_ROUTES.signIn}?${ACCOUNT_DELETED_PARAM}=1`;
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
