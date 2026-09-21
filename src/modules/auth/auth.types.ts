export const USER_ROLES = ["BAKER", "DEV"] as const;

export type UserRole = (typeof USER_ROLES)[number];

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

export interface AuthenticatedSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  profile: AuthProfile;
  requiresPasswordChange: boolean;
}
