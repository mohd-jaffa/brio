import { describe, it, expect } from "vitest";
import { generateTemporaryPassword } from "./security";
import {
  changePasswordSchema,
  confirmEmailSchema,
  loginSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  registerSchema,
} from "@/lib/validation";

describe("auth validation", () => {
  it("normalizes phone numbers before validation", () => {
    const parsed = loginSchema.parse({
      phone: "+91 98765-43210",
      password: "correct-password",
    });

    expect(parsed.phone).toBe("+919876543210");
  });

  it("adds the country code, so the ten digits a baker types find their account", () => {
    for (const typed of ["9876543210", "09876543210", "+91 98765-43210", "91 9876543210"]) {
      expect(loginSchema.parse({ phone: typed, password: "x" }).phone).toBe("+919876543210");
    }
  });

  it("refuses a number that is not a mobile one", () => {
    expect(loginSchema.safeParse({ phone: "1234567890", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ phone: "98765", password: "x" }).success).toBe(false);
  });

  it("requires registration email, phone, password, and confirmation", () => {
    const parsed = registerSchema.parse({
      name: "Asha Baker",
      businessName: "Asha Bakes",
      phone: "+919876543210",
      email: "ASHA@example.com",
      password: "super-secret",
      confirmPassword: "super-secret",
    });

    expect(parsed.email).toBe("asha@example.com");
    expect(parsed.phone).toBe("+919876543210");
  });

  it("rejects mismatched registration passwords", () => {
    const result = registerSchema.safeParse({
      name: "Asha Baker",
      businessName: "Asha Bakes",
      phone: "+919876543210",
      email: "asha@example.com",
      password: "super-secret",
      confirmPassword: "different-secret",
    });

    expect(result.success).toBe(false);
  });

  it("rejects mismatched forced password changes", () => {
    const result = changePasswordSchema.safeParse({
      newPassword: "new-secret",
      confirmPassword: "another-secret",
    });

    expect(result.success).toBe(false);
  });

  it("generates temporary passwords without logging or returning static values", () => {
    const first = generateTemporaryPassword();
    const second = generateTemporaryPassword();

    expect(first.length).toBe(12);
    expect(second.length).toBe(12);
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9]+$/);
  });
});

describe("password rules", () => {
  const registration = {
    name: "Asha Baker",
    businessName: "Asha Bakes",
    phone: "+919876543210",
    email: "asha@example.com",
  };

  it("refuses a password shorter than Supabase Auth itself accepts", () => {
    const password = "a".repeat(PASSWORD_MIN_LENGTH - 1);
    const result = registerSchema.safeParse({ ...registration, password, confirmPassword: password });

    expect(result.success).toBe(false);
  });

  it("refuses one longer than the hash can carry", () => {
    const password = "a".repeat(PASSWORD_MAX_LENGTH + 1);
    const result = registerSchema.safeParse({ ...registration, password, confirmPassword: password });

    expect(result.success).toBe(false);
  });

  it("does not apply a length rule to signing in, where the stored password decides", () => {
    expect(loginSchema.safeParse({ phone: "+919876543210", password: "old" }).success).toBe(true);
  });
});

describe("a confirmation link", () => {
  it("needs both tokens to be usable", () => {
    expect(confirmEmailSchema.safeParse({ accessToken: "a", refreshToken: "r" }).success).toBe(true);
    expect(confirmEmailSchema.safeParse({ accessToken: "a", refreshToken: "" }).success).toBe(false);
    expect(confirmEmailSchema.safeParse({ accessToken: "" }).success).toBe(false);
  });
});
