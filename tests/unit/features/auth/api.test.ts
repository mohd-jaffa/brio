import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendAccountConfirmation = vi.fn();
vi.mock("@/lib/mail/nodemailer.provider", () => ({
  createConfiguredMailService: () => ({ sendAccountConfirmation }),
}));
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => ({ NEXT_PUBLIC_APP_URL: "https://app.test" }) }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { register } from "@/features/auth/api";

const registration = {
  name: "Priya Menon",
  businessName: "Sweet Delights",
  phone: "+919876543210",
  email: "priya@example.com",
  password: "Password123!",
  confirmPassword: "Password123!",
};

/**
 * Just enough of the service-role client for registration: creating the auth
 * user, the business and the profile, the confirmation link, and removing the
 * user again when something after it fails. Every call is recorded.
 */
function fakeAdmin({ profileFails = false }: { profileFails?: boolean } = {}) {
  const createdUsers: Record<string, unknown>[] = [];
  const inserted: Array<[string, Record<string, unknown>]> = [];
  const deletedUsers: string[] = [];

  const client = {
    auth: {
      admin: {
        createUser: async (attributes: Record<string, unknown>) => {
          createdUsers.push(attributes);
          return { data: { user: { id: "u-1" } }, error: null };
        },
        generateLink: async () => ({ data: { properties: { action_link: "https://auth.test/verify?t=1" } }, error: null }),
        deleteUser: async (id: string) => {
          deletedUsers.push(id);
          return { error: null };
        },
      },
    },
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        inserted.push([table, row]);
        return {
          select: () => ({
            single: async () => {
              if (table === "bakeries") return { data: { id: "b-1" }, error: null };
              if (profileFails) return { data: null, error: { message: "duplicate key value violates unique constraint \"profiles_email_key\"" } };
              return {
                data: { ...row, email_confirmed_at: null },
                error: null,
              };
            },
          }),
        };
      },
      delete: () => ({ eq: async () => ({ error: null }) }),
    }),
  };
  return { client: client as unknown as SupabaseClient, createdUsers, inserted, deletedUsers };
}

beforeEach(() => {
  sendAccountConfirmation.mockReset();
  sendAccountConfirmation.mockResolvedValue(undefined);
});

describe("register", () => {
  it("keeps only the name in user_metadata, which a user can edit for themselves (BUG-17)", async () => {
    const { client, createdUsers } = fakeAdmin();
    await register(client, registration);

    expect(createdUsers).toHaveLength(1);
    expect(createdUsers[0].user_metadata).toEqual({ name: "Priya Menon" });
    expect(JSON.stringify(createdUsers[0])).not.toMatch(/role/i);
  });

  it("gives the role to the profile only, which only the server writes", async () => {
    const { client, inserted } = fakeAdmin();
    await register(client, registration);

    const profile = inserted.find(([table]) => table === "profiles")?.[1];
    expect(profile).toMatchObject({ id: "u-1", bakery_id: "b-1", role: expect.any(String) });
  });

  it("takes the new user away again when the rest of the account cannot be made", async () => {
    const { client, deletedUsers } = fakeAdmin({ profileFails: true });
    await expect(register(client, registration)).rejects.toMatchObject({ code: "AUTH_EMAIL_ALREADY_EXISTS" });
    expect(deletedUsers).toEqual(["u-1"]);
  });
});
