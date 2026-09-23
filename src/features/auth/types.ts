import { USER_ROLES, type UserRole } from "@/constants/roles";

export { USER_ROLES, type UserRole };

export interface AuthProfile {
  id: string;
  phone: string;
  email: string;
  name: string;
  role: UserRole;
  bakeryId: string;
  isActive: boolean;
  mustChangePassword: boolean;
  emailConfirmedAt: string | null;
}

/**
 * What the server holds about whoever is asking. The tokens never leave the
 * server: they are set as HttpOnly cookies and read back from them, so no
 * script in the browser can reach them (AGENTS.md §9).
 */
export interface AuthenticatedSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  profile: AuthProfile;
  requiresPasswordChange: boolean;
}

/** What the browser is told about the session — who they are, and nothing else. */
export interface AuthSessionView {
  profile: AuthProfile;
  requiresPasswordChange: boolean;
}
