import { vi } from "vitest";

import type { AuthProfile, AuthSessionView } from "@/features/auth/types";

/**
 * A signed-in baker, for the screens that only need one to exist. Component
 * tests stub `useAuth` rather than standing up a provider and a fetch, so what
 * they assert stays about the screen.
 */
export const TEST_PROFILE: AuthProfile = {
  id: "11111111-1111-4111-8111-111111111111",
  phone: "+919876543210",
  email: "asha@example.com",
  name: "Asha Baker",
  role: "BAKER",
  bakeryId: "22222222-2222-4222-8222-222222222222",
  isActive: true,
  mustChangePassword: false,
  emailConfirmedAt: "2026-01-01T00:00:00.000Z",
};

export const TEST_SESSION: AuthSessionView = {
  profile: TEST_PROFILE,
  requiresPasswordChange: false,
};

export function authStub(overrides: Record<string, unknown> = {}) {
  return {
    status: "authenticated",
    profile: TEST_PROFILE,
    requiresPasswordChange: false,
    signIn: vi.fn().mockResolvedValue(TEST_SESSION),
    signOut: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    adopt: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
