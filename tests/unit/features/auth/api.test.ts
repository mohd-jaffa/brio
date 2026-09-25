import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthProfile } from "@/features/auth/types";

const { sendAccountConfirmationMail, createJob, logger } = vi.hoisted(() => ({
  sendAccountConfirmationMail: vi.fn(),
  createJob: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/mail/nodemailer.provider", () => ({
  createConfiguredMailService: () => ({ sendAccountConfirmation: sendAccountConfirmationMail }),
}));
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => ({ NEXT_PUBLIC_APP_URL: "https://app.test" }) }));
vi.mock("@/lib/logger", () => ({ logger }));
vi.mock("@/lib/jobs/queue", () => ({ createJob }));

import { queueAccountConfirmation, register, resendConfirmation, sendAccountConfirmation } from "@/features/auth/api";

const registration = {
  name: "Priya Menon",
  businessName: "Sweet Delights",
  phone: "+919876543210",
  email: "priya@example.com",
  password: "Password123!",
  confirmPassword: "Password123!",
};

const profileRow = (overrides: Record<string, unknown> = {}) => ({
  id: "u-1",
  phone: "+919876543210",
  email: "priya@example.com",
  name: "Priya Menon",
  role: "USER",
  bakery_id: "b-1",
  is_active: true,
  must_change_password: false,
  email_confirmed_at: null,
  ...overrides,
});

/**
 * Just enough of the service-role client for registration and confirmation:
 * the auth admin calls, the business and profile inserts, reading a profile,
 * and looking for a confirmation already waiting on the queue. Every call is
 * recorded.
 */
function fakeAdmin({
  profileFails = false,
  profile = profileRow() as Record<string, unknown> | null,
  waitingJobs = [] as unknown[],
} = {}) {
  const createdUsers: Record<string, unknown>[] = [];
  const inserted: Array<[string, Record<string, unknown>]> = [];
  const deletedUsers: string[] = [];
  const jobFilters: unknown[][] = [];
  const links: Array<Record<string, unknown>> = [];

  const client = {
    auth: {
      admin: {
        createUser: async (attributes: Record<string, unknown>) => {
          createdUsers.push(attributes);
          return { data: { user: { id: "u-1" } }, error: null };
        },
        generateLink: async (request: Record<string, unknown>) => {
          links.push(request);
          return { data: { properties: { action_link: "https://auth.test/verify?t=1" } }, error: null };
        },
        deleteUser: async (id: string) => {
          deletedUsers.push(id);
          return { error: null };
        },
      },
    },
    from: (table: string) => {
      if (table === "jobs") {
        const chain = {
          select: () => chain,
          eq: (...args: unknown[]) => (jobFilters.push(["eq", ...args]), chain),
          in: (...args: unknown[]) => (jobFilters.push(["in", ...args]), chain),
          limit: async () => ({ data: waitingJobs, error: null }),
        };
        return chain;
      }
      return {
        insert: (row: Record<string, unknown>) => {
          inserted.push([table, row]);
          return {
            select: () => ({
              single: async () => {
                if (table === "bakeries") return { data: { id: "b-1" }, error: null };
                if (profileFails) {
                  return { data: null, error: { message: 'duplicate key value violates unique constraint "profiles_email_key"' } };
                }
                return { data: { ...row, email_confirmed_at: null }, error: null };
              },
            }),
          };
        },
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }) }),
        delete: () => ({ eq: async () => ({ error: null }) }),
      };
    },
  };
  return { client: client as unknown as SupabaseClient, createdUsers, inserted, deletedUsers, jobFilters, links };
}

beforeEach(() => {
  vi.clearAllMocks();
  sendAccountConfirmationMail.mockResolvedValue(undefined);
  createJob.mockResolvedValue(undefined);
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
    expect(profile).toMatchObject({ id: "u-1", bakery_id: "b-1", role: "USER" });
  });

  it("queues the confirmation email rather than sending it, naming only the user (BUG-16)", async () => {
    const { client } = fakeAdmin();
    await register(client, registration);

    expect(sendAccountConfirmationMail).not.toHaveBeenCalled();
    expect(createJob).toHaveBeenCalledWith(client, { type: "SEND_ACCOUNT_CONFIRMATION", payload: { userId: "u-1" } });
  });

  it("keeps the account when even the queue cannot take the email, and logs it", async () => {
    createJob.mockRejectedValue(new Error("queue down"));
    const { client, deletedUsers } = fakeAdmin();

    await expect(register(client, registration)).resolves.toMatchObject({ userId: "u-1", bakeryId: "b-1" });
    expect(deletedUsers).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith("Could not queue the confirmation email", { userId: "u-1", reason: "queue down" });
  });

  it("takes the new user away again when the rest of the account cannot be made", async () => {
    const { client, deletedUsers } = fakeAdmin({ profileFails: true });
    await expect(register(client, registration)).rejects.toMatchObject({ code: "AUTH_EMAIL_ALREADY_EXISTS" });
    expect(deletedUsers).toEqual(["u-1"]);
    expect(createJob).not.toHaveBeenCalled();
  });
});

describe("queueAccountConfirmation", () => {
  it("looks for a confirmation already waiting for this user", async () => {
    const { client, jobFilters } = fakeAdmin();
    await queueAccountConfirmation(client, "u-1");

    expect(jobFilters).toEqual([
      ["eq", "type", "SEND_ACCOUNT_CONFIRMATION"],
      ["in", "status", ["pending", "processing"]],
      ["eq", "payload->>userId", "u-1"],
    ]);
    expect(createJob).toHaveBeenCalledOnce();
  });

  it("adds nothing while one is still waiting, so two taps send one email", async () => {
    const { client } = fakeAdmin({ waitingJobs: [{ id: "j-1" }] });
    await queueAccountConfirmation(client, "u-1");
    expect(createJob).not.toHaveBeenCalled();
  });
});

describe("sendAccountConfirmation", () => {
  it("makes the link when it sends, so no sign-in token sits in the queue", async () => {
    const { client, links } = fakeAdmin();
    await sendAccountConfirmation(client, "u-1");

    expect(links).toEqual([
      { type: "magiclink", email: "priya@example.com", options: { redirectTo: "https://app.test/confirm-email" } },
    ]);
    expect(sendAccountConfirmationMail).toHaveBeenCalledWith({
      to: "priya@example.com",
      name: "Priya Menon",
      confirmationUrl: "https://auth.test/verify?t=1",
    });
  });

  it("sends nothing to an account already confirmed, or gone", async () => {
    for (const profile of [profileRow({ email_confirmed_at: "2026-09-25T10:00:00Z" }), null]) {
      const { client, links } = fakeAdmin({ profile });
      await expect(sendAccountConfirmation(client, "u-1")).resolves.toBeUndefined();
      expect(links).toEqual([]);
    }
    expect(sendAccountConfirmationMail).not.toHaveBeenCalled();
  });

  it("throws when the mail cannot go, so the queue tries again", async () => {
    sendAccountConfirmationMail.mockRejectedValue(new Error("SMTP refused"));
    const { client } = fakeAdmin();
    await expect(sendAccountConfirmation(client, "u-1")).rejects.toThrow("SMTP refused");
  });
});

describe("resendConfirmation", () => {
  const profile = { id: "u-1", emailConfirmedAt: null } as AuthProfile;

  it("queues the email again for the signed-in account", async () => {
    const { client } = fakeAdmin();
    await expect(resendConfirmation(client, profile)).resolves.toEqual({ queued: true });
    expect(createJob).toHaveBeenCalledWith(client, { type: "SEND_ACCOUNT_CONFIRMATION", payload: { userId: "u-1" } });
  });

  it("refuses when the address is already confirmed", async () => {
    const { client } = fakeAdmin();
    await expect(resendConfirmation(client, { ...profile, emailConfirmedAt: "2026-09-25T10:00:00Z" })).rejects.toMatchObject({
      code: "AUTH_EMAIL_ALREADY_CONFIRMED",
      httpStatus: 409,
    });
    expect(createJob).not.toHaveBeenCalled();
  });
});
