import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import { getServerEnv, supportEmail } from "@/lib/env/server";

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
  });

  it("refuses to start with a missing or malformed variable", () => {
    expect(() => getServerEnv({ ...base, SUPABASE_SERVICE_ROLE_KEY: "" })).toThrow(AppError);
    expect(() => env({ SUPPORT_EMAIL: "not an address" })).toThrow(AppError);
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
