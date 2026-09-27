import type { AvatarKey } from "@/constants/avatars";
import { USER_ROLES, type UserRole } from "@/constants/roles";

export { USER_ROLES, type UserRole };

export interface AuthProfile {
  id: string;
  phone: string;
  email: string;
  name: string;
  /** The profile picture: one of the nine that ship with the app (0026). */
  avatar: AvatarKey;
  role: UserRole;
  /** The owner's business; none for a developer, who owns none (0028). */
  bakeryId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  emailConfirmedAt: string | null;
  /** When each detail last changed; each changes once in 30 days (0021). */
  nameChangedAt: string | null;
  phoneChangedAt: string | null;
  emailChangedAt: string | null;
  /** A new email address waiting for its confirmation; `email` stays in use until then. */
  pendingEmail: string | null;
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
