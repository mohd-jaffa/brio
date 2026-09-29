import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthProfile } from "@/features/auth/types";

const { sendAccountConfirmationMail, createJob, logger, mode } = vi.hoisted(() => ({
  sendAccountConfirmationMail: vi.fn(),
  createJob: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  // Whether a worker runs (WORKER_ENABLED): none for now, and each path is kept.
  mode: { worker: false },
}));
vi.mock("@/constants/jobs", async (original) => ({
  ...(await original<typeof import("@/constants/jobs")>()),
  get WORKER_ENABLED() {
    return mode.worker;
  },
}));
vi.mock("@/lib/mail/nodemailer.provider", () => ({
  createConfiguredMailService: () => ({ sendAccountConfirmation: sendAccountConfirmationMail }),
}));
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => ({ NEXT_PUBLIC_APP_URL: "https://app.test" }) }));
vi.mock("@/lib/logger", () => ({ logger }));
vi.mock("@/lib/jobs/queue", () => ({ createJob }));

import {
  mapProfile,
  queueAccountConfirmation,
  register,
  resendConfirmation,
  sendAccountConfirmation,
} from "@/features/auth/api";

const registration = {
  name: "Priya Menon",
  businessName: "Sweet Delights",
  phone: "+919876543210",
  email: "priya@example.com",
  password: "Password123!",
  confirmPassword: "Password123!",
  tagline: "Baked fresh",
  city: "Pune",
  address: "12 MG Road",
};

const profileRow = (overrides: Record<string, unknown> = {}) => ({
  id: "u-1",
  phone: "+919876543210",
  email: "priya@example.com",
  name: "Priya Menon",
  avatar: "tiger",
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
                  return {
                    data: null,
                    error: { message: 'duplicate key value violates unique constraint "profiles_email_key"' },
                  };
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
  mode.worker = false;
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

  it("makes the business from the second step: name, catch phrase, city, address, and the sign-in number (§139.11.2)", async () => {
    const { client, inserted } = fakeAdmin();
    await register(client, registration);

    expect(inserted.find(([table]) => table === "bakeries")?.[1]).toMatchObject({
      owner_id: "u-1",
      business_name: "Sweet Delights",
      tagline: "Baked fresh",
      city: "Pune",
      address: "12 MG Road",
      phone: "+919876543210",
    });
  });

  it("gives the role to the profile only, which only the server writes", async () => {
    const { client, inserted } = fakeAdmin();
    await register(client, registration);

    const profile = inserted.find(([table]) => table === "profiles")?.[1];
    expect(profile).toMatchObject({ id: "u-1", bakery_id: "b-1", role: "USER" });
  });

  it("leaves the profile picture to the database, which draws one at random (0026)", async () => {
    const { client, inserted } = fakeAdmin();
    await register(client, registration);

    expect(inserted.find(([table]) => table === "profiles")?.[1]).not.toHaveProperty("avatar");
  });

  it("sends the confirmation email itself while no worker runs, and queues nothing", async () => {
    const { client } = fakeAdmin();
    await register(client, registration);

    expect(sendAccountConfirmationMail).toHaveBeenCalledWith(expect.objectContaining({ to: "priya@example.com" }));
    expect(createJob).not.toHaveBeenCalled();
  });

  it("keeps the account when the mail cannot go, and logs it, so Settings can send it again", async () => {
    sendAccountConfirmationMail.mockRejectedValue(new Error("SMTP refused"));
    const { client, deletedUsers } = fakeAdmin();

    await expect(register(client, registration)).resolves.toMatchObject({ userId: "u-1", bakeryId: "b-1" });
    expect(deletedUsers).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith("Could not send the confirmation email", {
      userId: "u-1",
      reason: "SMTP refused",
    });
  });

  it("queues the confirmation email when a worker runs, naming only the user (BUG-16)", async () => {
    mode.worker = true;
    const { client } = fakeAdmin();
    await register(client, registration);

    expect(sendAccountConfirmationMail).not.toHaveBeenCalled();
    expect(createJob).toHaveBeenCalledWith(client, { type: "SEND_ACCOUNT_CONFIRMATION", payload: { userId: "u-1" } });
  });

  it("keeps the account when even the queue cannot take the email, and logs it", async () => {
    mode.worker = true;
    createJob.mockRejectedValue(new Error("queue down"));
    const { client, deletedUsers } = fakeAdmin();

    await expect(register(client, registration)).resolves.toMatchObject({ userId: "u-1", bakeryId: "b-1" });
    expect(deletedUsers).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith("Could not send the confirmation email", {
      userId: "u-1",
      reason: "queue down",
    });
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

  it("sends the email again there and then while no worker runs", async () => {
    const { client } = fakeAdmin();
    await expect(resendConfirmation(client, profile)).resolves.toEqual({ queued: false });
    expect(sendAccountConfirmationMail).toHaveBeenCalledOnce();
    expect(createJob).not.toHaveBeenCalled();
  });

  it("answers a mail server's failure as the outside service's, never in its own words", async () => {
    sendAccountConfirmationMail.mockRejectedValueOnce(new Error("SMTP refused"));
    await expect(resendConfirmation(fakeAdmin().client, profile)).rejects.toMatchObject({
      code: "EXTERNAL_SERVICE_ERROR",
      httpStatus: 502,
    });
  });

  it("queues the email again when a worker runs", async () => {
    mode.worker = true;
    const { client } = fakeAdmin();
    await expect(resendConfirmation(client, profile)).resolves.toEqual({ queued: true });
    expect(createJob).toHaveBeenCalledWith(client, { type: "SEND_ACCOUNT_CONFIRMATION", payload: { userId: "u-1" } });
  });

  it("refuses when the address is already confirmed", async () => {
    const { client } = fakeAdmin();
    await expect(
      resendConfirmation(client, { ...profile, emailConfirmedAt: "2026-09-25T10:00:00Z" }),
    ).rejects.toMatchObject({
      code: "AUTH_EMAIL_ALREADY_CONFIRMED",
      httpStatus: 409,
    });
    expect(createJob).not.toHaveBeenCalled();
  });
});

describe("mapProfile", () => {
  it("carries the profile picture, and shows the first one for a key the app no longer has", () => {
    const row = {
      ...profileRow(),
      name_changed_at: null,
      phone_changed_at: null,
      email_changed_at: null,
      pending_email: null,
    };
    expect(mapProfile(row as Parameters<typeof mapProfile>[0]).avatar).toBe("tiger");
    expect(mapProfile({ ...row, avatar: "dragon" } as Parameters<typeof mapProfile>[0]).avatar).toBe("pomeranian");
  });
});
