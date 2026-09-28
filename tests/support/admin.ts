import { vi } from "vitest";

import type { AdminAccount, AdminAuditEntry, AdminOverview } from "@/features/admin/types";
import { authStub, TEST_PROFILE } from "@tests/support/auth";

/** The developer signed in to the console: no business (0028). */
export const DEV_PROFILE = {
  ...TEST_PROFILE,
  id: "f1f2f3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f",
  name: "Brio Developer",
  phone: "+919123456789",
  email: "dev@ovenly.local",
  avatar: "pomeranian" as const,
  role: "DEV" as const,
  bakeryId: null,
};

export const devAuth = (overrides: Record<string, unknown> = {}) => authStub({ profile: DEV_PROFILE, ...overrides });

export const anOverview = (): AdminOverview => ({
  users: { total: 5, owners: 4, developers: 1 },
  businesses: 4,
  audit: { total: 120, lastDay: 9 },
});

export const anAccount = (id: string, overrides: Partial<AdminAccount> = {}): AdminAccount => ({
  id,
  name: "Priya Baker",
  phone: "+919876543210",
  email: "baker@example.com",
  role: "USER",
  avatar: "beagle",
  active: true,
  mustChangePassword: false,
  emailConfirmedAt: "2026-06-26T10:00:00Z",
  createdAt: "2026-06-26T10:00:00Z",
  business: { name: "Sweet Delights", city: "Bengaluru" },
  ...overrides,
});

export const anAuditEntry = (id: string, overrides: Partial<AdminAuditEntry> = {}): AdminAuditEntry => ({
  id,
  action: "UPDATE",
  entityType: "orders",
  entityId: "7c1f3a52-9d7e-4b1a-8a51-0f1d2c3b4a5e",
  actor: "Priya Baker",
  business: "Sweet Delights",
  before: { status: "PENDING" },
  after: { status: "READY" },
  createdAt: "2026-09-27T10:00:00Z",
  ...overrides,
});

/** A fetcher answering each key from `answers`; an Error there is thrown. */
export function answering(fetcher: ReturnType<typeof vi.fn>, answers: Record<string, unknown>) {
  fetcher.mockReset();
  fetcher.mockImplementation(async (key: string) => {
    const answer = answers[key];
    if (answer instanceof Error) throw answer;
    return answer;
  });
}
