import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import { getServerEnv, supportEmail, webPushKeys } from "@/lib/env/server";

const base = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NODE_ENV: "test",
} as NodeJS.ProcessEnv;

const env = (extra: Record<string, string> = {}) => getServerEnv({ ...base, ...extra });

describe("getServerEnv", () => {
  it("reads what the app needs, and leaves an empty optional as nothing", () => {
    const read = env({ SMTP_PORT: "587", SMTP_SECURE: "false", SMTP_HOST: "", SUPPORT_EMAIL: "" });
    expect(read.SMTP_PORT).toBe(587);
    expect(read.SMTP_SECURE).toBe(false);
    expect(read.SMTP_HOST).toBeUndefined();
    expect(read.SUPPORT_EMAIL).toBeUndefined();
    const blank = env({ VAPID_SUBJECT: "", CRON_SECRET: "" });
    expect(blank.VAPID_SUBJECT).toBeUndefined();
    expect(blank.CRON_SECRET).toBeUndefined();
  });

  it("takes a switch already read as true or false", () => {
    for (const secure of [true, false]) {
      expect(getServerEnv({ ...base, SMTP_SECURE: secure } as unknown as NodeJS.ProcessEnv).SMTP_SECURE).toBe(secure);
    }
  });

  it("refuses to start with a missing or malformed variable", () => {
    expect(() => getServerEnv({ ...base, SUPABASE_SERVICE_ROLE_KEY: "" })).toThrow(AppError);
    expect(() => env({ SUPPORT_EMAIL: "not an address" })).toThrow(AppError);
    expect(() => env({ VAPID_SUBJECT: "http://brio.app" })).toThrow(AppError);
    expect(() => env({ CRON_SECRET: "too short" })).toThrow(AppError);
    expect(() => env({ SMTP_SECURE: "maybe" })).toThrow(AppError);
  });
});

describe("supportEmail", () => {
  it("is SUPPORT_EMAIL when it is set", () => {
    expect(supportEmail(env({ SUPPORT_EMAIL: "hello@brio.app", SMTP_FROM: "Brio <no-reply@brio.app>" }))).toBe(
      "hello@brio.app",
    );
  });

  it("falls back to the address the emails are sent from, named or bare", () => {
    expect(supportEmail(env({ SMTP_FROM: "Brio <mail@brio.app>" }))).toBe("mail@brio.app");
    expect(supportEmail(env({ SMTP_FROM: "mail@brio.app" }))).toBe("mail@brio.app");
  });

  it("is nothing when neither gives an address", () => {
    expect(supportEmail(env())).toBeNull();
    expect(supportEmail(env({ SMTP_FROM: "Brio" }))).toBeNull();
  });
});

describe("webPushKeys", () => {
  const keys = { NEXT_PUBLIC_VAPID_PUBLIC_KEY: "BPublic", VAPID_PRIVATE_KEY: "private" };

  it("is the key pair and the subject, the support address when no subject is named", () => {
    expect(webPushKeys(env({ ...keys, VAPID_SUBJECT: "https://brio.app" }))).toEqual({
      publicKey: "BPublic",
      privateKey: "private",
      subject: "https://brio.app",
    });
    expect(webPushKeys(env({ ...keys, SUPPORT_EMAIL: "hello@brio.app" }))?.subject).toBe("mailto:hello@brio.app");
  });

  it("is nothing while a key, or anyone to write to, is missing: web push is off", () => {
    expect(webPushKeys(env({ VAPID_PRIVATE_KEY: "private", SUPPORT_EMAIL: "hello@brio.app" }))).toBeNull();
    expect(webPushKeys(env({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: "BPublic", SUPPORT_EMAIL: "hello@brio.app" }))).toBeNull();
    expect(webPushKeys(env(keys))).toBeNull();
  });
});
