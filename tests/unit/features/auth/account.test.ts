import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthProfile } from "@/features/auth/types";
import { AppError } from "@/lib/errors";
import type { Tenant } from "@/lib/supabase/tenant";

const {
  sendMail,
  createJob,
  logActionSafe,
  logger,
  captureError,
  signInWithPassword,
  signOut,
  removeBusinessFiles,
  mode,
} = vi.hoisted(() => ({
  sendMail: vi.fn(),
  captureError: vi.fn(),
  createJob: vi.fn(),
  logActionSafe: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  removeBusinessFiles: vi.fn(),
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
  createConfiguredMailService: () => ({ sendEmailChange: sendMail }),
}));
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => ({ NEXT_PUBLIC_APP_URL: "https://app.test" }) }));
vi.mock("@/lib/jobs/queue", () => ({ createJob }));
vi.mock("@/lib/audit/auditLog", () => ({ logActionSafe }));
vi.mock("@/lib/logger", () => ({ logger }));
vi.mock("@/lib/audit/errorLog", () => ({ captureError }));
vi.mock("@/features/business/api", () => ({ removeBusinessFiles }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAnonClient: () => ({ auth: { signInWithPassword, signOut } }),
}));

const {
  changeAvatar,
  changeName,
  changePhone,
  confirmEmailChange,
  deleteAccount,
  markWelcomed,
  requestEmailChange,
  resendEmailChange,
  sendEmailChangeConfirmation,
} = await import("@/features/auth/account");

const RECENT = new Date(Date.now() - 2 * 86_400_000).toISOString();

const profile = (changes: Partial<AuthProfile> = {}): AuthProfile => ({
  id: "u-1",
  phone: "+919876543210",
  email: "asha@example.com",
  name: "Asha Baker",
  avatar: "husky",
  role: "USER",
  bakeryId: "b-1",
  isActive: true,
  mustChangePassword: false,
  emailConfirmedAt: "2026-01-01T00:00:00.000Z",
  nameChangedAt: null,
  phoneChangedAt: null,
  emailChangedAt: null,
  pendingEmail: null,
  welcomedAt: "2026-01-01T00:00:00.000Z",
  ...changes,
});

const row = (changes: Record<string, unknown> = {}) => ({
  id: "u-1",
  phone: "+919876543210",
  email: "asha@example.com",
  name: "Asha Baker",
  avatar: "husky",
  role: "USER",
  bakery_id: "b-1",
  is_active: true,
  must_change_password: false,
  email_confirmed_at: "2026-01-01T00:00:00.000Z",
  name_changed_at: null,
  phone_changed_at: null,
  email_changed_at: null,
  pending_email: null,
  welcomed_at: "2026-01-01T00:00:00.000Z",
  ...changes,
});

type Op = [string, ...unknown[]];
type Answer = { data?: unknown; error?: unknown };

/**
 * The service-role client, as far as the account functions use it: every
 * query is a chain of calls, answered when it is awaited by `answer`, which
 * sees the table and the calls made. Auth's admin updates are recorded.
 */
function fakeAdmin(answer: (table: string, ops: Op[]) => Answer, authErrors: unknown[] = []) {
  const queries: { table: string; ops: Op[] }[] = [];
  const updateUserById = vi.fn(async () => ({ error: authErrors.shift() ?? null }));
  const client = {
    auth: { admin: { updateUserById } },
    from(table: string) {
      const ops: Op[] = [];
      queries.push({ table, ops });
      const chain: object = new Proxy(
        {},
        {
          get(_, prop) {
            if (prop === "then") {
              const { data = null, error = null } = answer(table, ops);
              return (resolve: (value: unknown) => void) => resolve({ data, error });
            }
            return (...args: unknown[]) => {
              ops.push([String(prop), ...args]);
              return chain;
            };
          },
        },
      );
      return chain;
    },
  };
  return { admin: client as unknown as SupabaseClient, queries, updateUserById };
}

const has = (ops: Op[], name: string) => ops.find(([op]) => op === name);
const updateOf = (queries: { table: string; ops: Op[] }[]) =>
  queries.filter(({ ops }) => has(ops, "update")).map(({ ops }) => has(ops, "update")![1]);

const tenant: Tenant = { supabase: {} as SupabaseClient, bakeryId: "b-1", actorId: "u-1" };

/**
 * Profiles: none else holds the value; a write answers with the row as
 * changed, and a read with the row as `read` has it; jobs: none waiting.
 */
function ordinary(
  changed: Record<string, unknown> = {},
  { free = true, waiting = [] as unknown[], read = {} as Record<string, unknown> } = {},
) {
  return (table: string, ops: Op[]): Answer => {
    if (table === "jobs") return { data: waiting };
    if (has(ops, "neq")) return { data: free ? [] : [{ id: "u-2" }] };
    if (has(ops, "update")) return { data: row(changed) };
    return { data: row(read) };
  };
}

async function refusal(run: Promise<unknown>) {
  const error = await run.then(
    () => null,
    (failure: unknown) => failure,
  );
  expect(error).toBeInstanceOf(AppError);
  return { code: (error as AppError).code, status: (error as AppError).httpStatus };
}

beforeEach(() => {
  vi.clearAllMocks();
  mode.worker = false;
  signInWithPassword.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
  signOut.mockResolvedValue({ error: null });
});

describe("changeName", () => {
  it("changes the name, and records who changed it from what", async () => {
    const { admin, queries } = fakeAdmin(ordinary({ name: "Asha B", name_changed_at: "2026-09-26T00:00:00Z" }));
    const saved = await changeName(admin, tenant, profile(), { name: "Asha B" });
    expect(saved).toMatchObject({ name: "Asha B", nameChangedAt: "2026-09-26T00:00:00Z" });
    expect(updateOf(queries)).toEqual([{ name: "Asha B" }]);
    expect(logActionSafe).toHaveBeenCalledWith(
      tenant,
      expect.objectContaining({
        entity_type: "profiles",
        previous_data: { name: "Asha Baker" },
        new_data: { name: "Asha B" },
      }),
    );
  });

  it("refuses the same name, and one changed within 30 days, before writing", async () => {
    const { admin, queries } = fakeAdmin(ordinary());
    expect(await refusal(changeName(admin, tenant, profile(), { name: "Asha Baker" }))).toEqual({
      code: "PROFILE_VALUE_SAME",
      status: 400,
    });
    expect(await refusal(changeName(admin, tenant, profile({ nameChangedAt: RECENT }), { name: "Asha B" }))).toEqual({
      code: "PROFILE_CHANGE_TOO_SOON",
      status: 422,
    });
    expect(queries).toEqual([]);
  });

  it("says the database's refusal in the app's words, and any other failure as a clash or an outage", async () => {
    const tooSoon = fakeAdmin(() => ({
      error: { code: "P0001", hint: "PROFILE_CHANGE_TOO_SOON", message: "changed too recently" },
    }));
    expect((await refusal(changeName(tooSoon.admin, tenant, profile(), { name: "Asha B" }))).code).toBe(
      "PROFILE_CHANGE_TOO_SOON",
    );
    const broken = fakeAdmin(() => ({ error: { code: "08006", message: "connection lost" } }));
    expect((await refusal(changeName(broken.admin, tenant, profile(), { name: "Asha B" }))).code).toBe(
      "EXTERNAL_SERVICE_ERROR",
    );
  });
});

describe("changeAvatar", () => {
  it("changes the picture as often as asked, and records who changed it from what", async () => {
    const { admin, queries } = fakeAdmin(ordinary({ avatar: "tiger" }));
    const saved = await changeAvatar(admin, tenant, profile({ nameChangedAt: RECENT }), { avatar: "tiger" });
    expect(saved.avatar).toBe("tiger");
    expect(updateOf(queries)).toEqual([{ avatar: "tiger" }]);
    expect(logActionSafe).toHaveBeenCalledWith(tenant, {
      action: "UPDATE",
      entity_type: "profiles",
      entity_id: "u-1",
      previous_data: { avatar: "husky" },
      new_data: { avatar: "tiger" },
    });
  });

  it("takes the picture already in use as no change, and writes nothing", async () => {
    const { admin, queries } = fakeAdmin(ordinary());
    const current = profile();
    await expect(changeAvatar(admin, tenant, current, { avatar: "husky" })).resolves.toBe(current);
    expect(queries).toEqual([]);
    expect(logActionSafe).not.toHaveBeenCalled();
  });

  it("says a failed write as an outage, and audits nothing", async () => {
    const broken = fakeAdmin(() => ({ error: { code: "08006", message: "connection lost" } }));
    expect((await refusal(changeAvatar(broken.admin, tenant, profile(), { avatar: "tiger" }))).code).toBe(
      "EXTERNAL_SERVICE_ERROR",
    );
    expect(logActionSafe).not.toHaveBeenCalled();
  });
});

describe("markWelcomed", () => {
  it("records when a new account's owner was welcomed, and audits nothing", async () => {
    const { admin, queries } = fakeAdmin(ordinary({ welcomed_at: "2026-09-30T04:00:00.000Z" }));
    const saved = await markWelcomed(admin, profile({ welcomedAt: null }));
    expect(saved.welcomedAt).toBe("2026-09-30T04:00:00.000Z");
    const [changes] = updateOf(queries) as [{ welcomed_at: string }];
    expect(Object.keys(changes)).toEqual(["welcomed_at"]);
    expect(Number.isNaN(Date.parse(changes.welcomed_at))).toBe(false);
    expect(logActionSafe).not.toHaveBeenCalled();
  });

  it("keeps the first time for an account already welcomed, and writes nothing", async () => {
    const { admin, queries } = fakeAdmin(ordinary());
    const current = profile();
    await expect(markWelcomed(admin, current)).resolves.toBe(current);
    expect(queries).toEqual([]);
  });

  it("says a failed write as an outage", async () => {
    const broken = fakeAdmin(() => ({ error: { code: "08006", message: "connection lost" } }));
    expect((await refusal(markWelcomed(broken.admin, profile({ welcomedAt: null })))).code).toBe(
      "EXTERNAL_SERVICE_ERROR",
    );
  });
});

describe("changePhone", () => {
  const input = { phone: "+919000022222", password: "Password123!" };

  it("checks the password on a session of its own, changes Auth's number, then the profile's", async () => {
    const { admin, queries, updateUserById } = fakeAdmin(ordinary({ phone: input.phone }));
    const saved = await changePhone(admin, tenant, profile(), input);
    expect(signInWithPassword).toHaveBeenCalledWith({ phone: "+919876543210", password: "Password123!" });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(updateUserById).toHaveBeenCalledWith("u-1", { phone: input.phone, phone_confirm: true });
    expect(updateOf(queries)).toEqual([{ phone: input.phone }]);
    expect(saved.phone).toBe(input.phone);
    expect(logActionSafe).toHaveBeenCalledWith(tenant, expect.objectContaining({ new_data: { phone: input.phone } }));
  });

  it("refuses the same number, one changed within 30 days, one another account holds, and a wrong password", async () => {
    const { admin, updateUserById } = fakeAdmin(ordinary({}, { free: false }));
    expect((await refusal(changePhone(admin, tenant, profile(), { ...input, phone: "+919876543210" }))).code).toBe(
      "PROFILE_VALUE_SAME",
    );
    expect((await refusal(changePhone(admin, tenant, profile({ phoneChangedAt: RECENT }), input))).code).toBe(
      "PROFILE_CHANGE_TOO_SOON",
    );
    expect(await refusal(changePhone(admin, tenant, profile(), input))).toEqual({
      code: "AUTH_PHONE_ALREADY_EXISTS",
      status: 409,
    });

    signInWithPassword.mockResolvedValue({ data: { session: null }, error: { message: "Invalid login credentials" } });
    const free = fakeAdmin(ordinary());
    // A 400, not a 401: the caller's own session is fine.
    expect(await refusal(changePhone(free.admin, tenant, profile(), input))).toEqual({
      code: "AUTH_PASSWORD_INCORRECT",
      status: 400,
    });
    expect(updateUserById).not.toHaveBeenCalled();
    expect(free.updateUserById).not.toHaveBeenCalled();
  });

  it("stops when the check for a taken number cannot be made", async () => {
    const { admin } = fakeAdmin((table, ops) =>
      has(ops, "neq") ? { error: { message: "timeout" } } : { data: row() },
    );
    expect((await refusal(changePhone(admin, tenant, profile(), input))).code).toBe("INTERNAL_ERROR");
  });

  it("says a number Auth already knows as taken", async () => {
    const { admin } = fakeAdmin(ordinary(), [{ message: "Phone number already registered by another user" }]);
    expect((await refusal(changePhone(admin, tenant, profile(), input))).code).toBe("AUTH_PHONE_ALREADY_EXISTS");
  });

  it("puts Auth's number back when the profile cannot follow, and logs when even that fails", async () => {
    const failing = (table: string, ops: Op[]): Answer =>
      has(ops, "update")
        ? { error: { code: "P0001", hint: "PROFILE_CHANGE_TOO_SOON", message: "too soon" } }
        : ordinary()(table, ops);
    const { admin, updateUserById } = fakeAdmin(failing);
    expect((await refusal(changePhone(admin, tenant, profile(), input))).code).toBe("PROFILE_CHANGE_TOO_SOON");
    expect(updateUserById).toHaveBeenLastCalledWith("u-1", { phone: "+919876543210", phone_confirm: true });
    expect(captureError).not.toHaveBeenCalled();

    const worse = fakeAdmin(failing, [null, { message: "down" }]);
    await refusal(changePhone(worse.admin, tenant, profile(), input));
    expect(captureError).toHaveBeenCalledExactlyOnceWith({
      message: "Could not put the sign-in number back after a failed change",
      error: { message: "down" },
      userId: "u-1",
    });
  });
});

describe("requestEmailChange", () => {
  const input = { email: "asha.new@example.com", password: "Password123!" };

  it("keeps the new address waiting, the current one in use, and sends its link there and then", async () => {
    const { admin, queries } = fakeAdmin(
      ordinary({ pending_email: input.email }, { read: { pending_email: input.email } }),
    );
    const saved = await requestEmailChange(admin, tenant, profile(), input);
    expect(saved).toMatchObject({ email: "asha@example.com", pendingEmail: input.email });
    expect(updateOf(queries)[0]).toEqual({
      pending_email: input.email,
      pending_email_token_hash: null,
      pending_email_expires_at: null,
    });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: input.email }));
    expect(createJob).not.toHaveBeenCalled();
    expect(logActionSafe).toHaveBeenCalledWith(
      tenant,
      expect.objectContaining({ new_data: { pending_email: input.email } }),
    );
  });

  it("keeps the address waiting when its link cannot go, and logs it, so Settings can send it again", async () => {
    sendMail.mockRejectedValueOnce(new Error("SMTP refused"));
    const { admin } = fakeAdmin(ordinary({ pending_email: input.email }, { read: { pending_email: input.email } }));
    await expect(requestEmailChange(admin, tenant, profile(), input)).resolves.toMatchObject({
      pendingEmail: input.email,
    });
    expect(captureError).toHaveBeenCalledWith({
      message: "Could not send the new email's link",
      error: new Error("SMTP refused"),
      userId: "u-1",
    });
    expect(logActionSafe).toHaveBeenCalled();

    sendMail.mockRejectedValueOnce("offline");
    await requestEmailChange(
      fakeAdmin(ordinary({}, { read: { pending_email: input.email } })).admin,
      tenant,
      profile(),
      input,
    );
    expect(captureError).toHaveBeenLastCalledWith({
      message: "Could not send the new email's link",
      error: "offline",
      userId: "u-1",
    });
  });

  it("queues its link when a worker runs, and nothing more while one is already on its way", async () => {
    mode.worker = true;
    const { admin } = fakeAdmin(ordinary({ pending_email: input.email }));
    await requestEmailChange(admin, tenant, profile(), input);
    expect(createJob).toHaveBeenCalledWith({
      type: "SEND_EMAIL_CHANGE_CONFIRMATION",
      payload: { userId: "u-1" },
    });
    expect(sendMail).not.toHaveBeenCalled();

    createJob.mockClear();
    await requestEmailChange(
      fakeAdmin(ordinary({ pending_email: input.email }, { waiting: [{ id: "j-1" }] })).admin,
      tenant,
      profile(),
      input,
    );
    expect(createJob).not.toHaveBeenCalled();
  });

  it("refuses the same address in any case, one changed within 30 days, one taken, and a wrong password", async () => {
    const { admin } = fakeAdmin(ordinary({}, { free: false }));
    const current = profile({ email: "Asha@Example.com" });
    expect(
      (await refusal(requestEmailChange(admin, tenant, current, { ...input, email: "asha@example.com" }))).code,
    ).toBe("PROFILE_VALUE_SAME");
    expect((await refusal(requestEmailChange(admin, tenant, profile({ emailChangedAt: RECENT }), input))).code).toBe(
      "PROFILE_CHANGE_TOO_SOON",
    );
    expect((await refusal(requestEmailChange(admin, tenant, profile(), input))).code).toBe("AUTH_EMAIL_ALREADY_EXISTS");
    signInWithPassword.mockResolvedValue({ data: { session: null }, error: { message: "no" } });
    expect((await refusal(requestEmailChange(fakeAdmin(ordinary()).admin, tenant, profile(), input))).code).toBe(
      "AUTH_PASSWORD_INCORRECT",
    );
  });

  it("keeps the address waiting when a worker runs and the queue cannot be read, and logs it", async () => {
    mode.worker = true;
    const { admin } = fakeAdmin((table, ops) =>
      table === "jobs" ? { error: { message: "down" } } : ordinary({ pending_email: input.email })(table, ops),
    );
    await expect(requestEmailChange(admin, tenant, profile(), input)).resolves.toMatchObject({
      pendingEmail: input.email,
    });
    expect(captureError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Could not send the new email's link", userId: "u-1" }),
    );
  });
});

describe("resendEmailChange", () => {
  const waiting = () => profile({ pendingEmail: "asha.new@example.com" });

  it("sends the waiting address's link again there and then, and refuses when nothing is waiting", async () => {
    const { admin } = fakeAdmin(ordinary({}, { read: { pending_email: "asha.new@example.com" } }));
    await expect(resendEmailChange(admin, waiting())).resolves.toEqual({ queued: false });
    expect(sendMail).toHaveBeenCalledOnce();
    expect((await refusal(resendEmailChange(admin, profile()))).code).toBe("AUTH_NO_PENDING_EMAIL");
  });

  it("answers a mail server's failure as the outside service's, never in its own words", async () => {
    sendMail.mockRejectedValueOnce(new Error("SMTP refused"));
    const { admin } = fakeAdmin(ordinary({}, { read: { pending_email: "asha.new@example.com" } }));
    expect(await refusal(resendEmailChange(admin, waiting()))).toEqual({ code: "EXTERNAL_SERVICE_ERROR", status: 502 });
  });

  it("queues it again when a worker runs", async () => {
    mode.worker = true;
    const { admin } = fakeAdmin(ordinary());
    await expect(resendEmailChange(admin, waiting())).resolves.toEqual({ queued: true });
    expect(createJob).toHaveBeenCalledOnce();
  });
});

describe("sendEmailChangeConfirmation", () => {
  it("makes a fresh token, keeps only its hash, and sends registration's email to the new address", async () => {
    const { admin, queries } = fakeAdmin(() => ({ data: row({ pending_email: "asha.new@example.com" }) }));
    const before = Date.now();
    await sendEmailChangeConfirmation(admin, "u-1");

    const [stored] = updateOf(queries) as { pending_email_token_hash: string; pending_email_expires_at: string }[];
    const mail = sendMail.mock.calls[0][0] as { to: string; name: string; confirmationUrl: string };
    expect(mail).toMatchObject({ to: "asha.new@example.com", name: "Asha Baker" });
    const [address, token] = mail.confirmationUrl.split("#change=");
    expect(address).toBe("https://app.test/confirm-email");
    expect(stored.pending_email_token_hash).toBe(createHash("sha256").update(token).digest("hex"));
    const lasts = new Date(stored.pending_email_expires_at).getTime() - before;
    expect(lasts).toBeGreaterThanOrEqual(48 * 3_600_000 - 1_000);
    expect(lasts).toBeLessThanOrEqual(48 * 3_600_000 + 1_000);
  });

  it("sends nothing when no new address is waiting, or no account is there", async () => {
    await sendEmailChangeConfirmation(fakeAdmin(() => ({ data: row() })).admin, "u-1");
    await sendEmailChangeConfirmation(fakeAdmin(() => ({ data: null })).admin, "u-1");
    expect(sendMail).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledTimes(2);
  });

  it("fails, for the queue to try again, when the token cannot be kept", async () => {
    const { admin } = fakeAdmin((table, ops) =>
      has(ops, "update") ? { error: { message: "down" } } : { data: row({ pending_email: "asha.new@example.com" }) },
    );
    expect((await refusal(sendEmailChangeConfirmation(admin, "u-1"))).code).toBe("INTERNAL_ERROR");
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe("confirmEmailChange", () => {
  const TOKEN = "a-token-long-enough-to-be-one";
  const waiting = (changes: Record<string, unknown> = {}) =>
    row({
      pending_email: "asha.new@example.com",
      pending_email_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      ...changes,
    });

  it("finds the account by the token's hash, changes Auth's email, then the profile's, and records it", async () => {
    const { admin, queries, updateUserById } = fakeAdmin((table, ops) =>
      has(ops, "update") ? { data: row({ email: "asha.new@example.com" }) } : { data: waiting() },
    );
    await expect(confirmEmailChange(admin, { token: TOKEN })).resolves.toEqual({ email: "asha.new@example.com" });
    expect(has(queries[0].ops, "eq")).toEqual([
      "eq",
      "pending_email_token_hash",
      createHash("sha256").update(TOKEN).digest("hex"),
    ]);
    expect(updateUserById).toHaveBeenCalledWith("u-1", { email: "asha.new@example.com", email_confirm: true });
    expect(updateOf(queries)).toEqual([
      expect.objectContaining({
        email: "asha.new@example.com",
        pending_email: null,
        pending_email_token_hash: null,
        pending_email_expires_at: null,
      }),
    ]);
    expect(logActionSafe).toHaveBeenCalledWith(
      { supabase: admin, bakeryId: "b-1", actorId: "u-1" },
      expect.objectContaining({
        previous_data: { email: "asha@example.com" },
        new_data: { email: "asha.new@example.com" },
      }),
    );
  });

  it("records nothing in a business's trail for an account with no business", async () => {
    const { admin } = fakeAdmin((table, ops) =>
      has(ops, "update")
        ? { data: row({ email: "dev.new@example.com", bakery_id: null }) }
        : { data: waiting({ bakery_id: null }) },
    );
    await expect(confirmEmailChange(admin, { token: TOKEN })).resolves.toEqual({ email: "dev.new@example.com" });
    expect(logActionSafe).not.toHaveBeenCalled();
  });

  it("refuses a token it does not know, one that lapsed, and one with nothing waiting", async () => {
    for (const data of [
      null,
      waiting({ pending_email_expires_at: new Date(Date.now() - 1_000).toISOString() }),
      waiting({ pending_email: null }),
      waiting({ pending_email_expires_at: null }),
    ]) {
      expect((await refusal(confirmEmailChange(fakeAdmin(() => ({ data })).admin, { token: TOKEN }))).code).toBe(
        "AUTH_EMAIL_CONFIRM_FAILED",
      );
    }
  });

  it("stops when the token cannot be looked up, and says an address Auth already knows as taken", async () => {
    expect(
      (await refusal(confirmEmailChange(fakeAdmin(() => ({ error: { message: "down" } })).admin, { token: TOKEN })))
        .code,
    ).toBe("INTERNAL_ERROR");
    const taken = fakeAdmin(
      () => ({ data: waiting() }),
      [{ message: "A user with this email address has already been registered" }],
    );
    expect((await refusal(confirmEmailChange(taken.admin, { token: TOKEN }))).code).toBe("AUTH_EMAIL_ALREADY_EXISTS");
  });

  it("puts Auth's email back when the profile cannot follow, and logs when even that fails", async () => {
    const failing = (table: string, ops: Op[]): Answer =>
      has(ops, "update")
        ? { error: { code: "23505", message: "duplicate key value violates unique constraint profiles_email_key" } }
        : { data: waiting() };
    const { admin, updateUserById } = fakeAdmin(failing);
    expect((await refusal(confirmEmailChange(admin, { token: TOKEN }))).code).toBe("AUTH_EMAIL_ALREADY_EXISTS");
    expect(updateUserById).toHaveBeenLastCalledWith("u-1", { email: "asha@example.com", email_confirm: true });

    const worse = fakeAdmin(failing, [null, { message: "down" }]);
    await refusal(confirmEmailChange(worse.admin, { token: TOKEN }));
    expect(captureError).toHaveBeenCalledExactlyOnceWith({
      message: "Could not put the email back after a failed change",
      error: { message: "down" },
      userId: "u-1",
    });
  });
});

describe("deleteAccount", () => {
  const input = {
    phone: "+919876543210",
    email: "asha@example.com",
    password: "Password123!",
    confirmPassword: "Password123!",
  };

  /** The service-role client as deleting uses it: one call to the database's function. */
  function deleting(answer: Answer = { data: "b-1", error: null }) {
    const rpc = vi.fn().mockResolvedValue({ data: answer.data ?? null, error: answer.error ?? null });
    return { admin: { rpc } as unknown as SupabaseClient, rpc };
  }

  it("checks the password on a session of its own, deletes it all in one call, then the logo's files, and logs it by id", async () => {
    const { admin, rpc } = deleting();
    expect(await deleteAccount(admin, profile(), input)).toEqual({ deleted: true });
    expect(signInWithPassword).toHaveBeenCalledWith({ phone: "+919876543210", password: "Password123!" });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(rpc).toHaveBeenCalledWith("delete_account", { p_user_id: "u-1" });
    expect(removeBusinessFiles).toHaveBeenCalledWith(admin, "b-1");
    expect(logger.info).toHaveBeenCalledWith("Account deleted", { userId: "u-1", bakeryId: "b-1" });
    // The trail was the business's, and went with it.
    expect(logActionSafe).not.toHaveBeenCalled();
  });

  it("takes the email however the account has it written", async () => {
    const { admin, rpc } = deleting();
    await deleteAccount(admin, profile({ email: "Asha@Example.com" }), input);
    expect(rpc).toHaveBeenCalledOnce();
  });

  it("refuses another number, another email and a wrong password, before anything is deleted", async () => {
    const { admin, rpc } = deleting();
    expect(await refusal(deleteAccount(admin, profile(), { ...input, phone: "+919000022222" }))).toEqual({
      code: "ACCOUNT_PHONE_MISMATCH",
      status: 400,
    });
    expect(await refusal(deleteAccount(admin, profile(), { ...input, email: "someone@example.com" }))).toEqual({
      code: "ACCOUNT_EMAIL_MISMATCH",
      status: 400,
    });
    expect(signInWithPassword).not.toHaveBeenCalled();

    signInWithPassword.mockResolvedValue({ data: { session: null }, error: { message: "Invalid login credentials" } });
    // A 400, not a 401: the caller's own session is fine, and stays.
    expect(await refusal(deleteAccount(admin, profile(), input))).toEqual({
      code: "AUTH_PASSWORD_INCORRECT",
      status: 400,
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(removeBusinessFiles).not.toHaveBeenCalled();
  });

  it("says the database's refusal in the app's words, and removes no files", async () => {
    const { admin } = deleting({ error: { code: "P0001", hint: "RECORD_NOT_FOUND", message: "no such owner" } });
    expect(await refusal(deleteAccount(admin, profile(), input))).toEqual({ code: "RECORD_NOT_FOUND", status: 404 });
    expect(removeBusinessFiles).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });
});
