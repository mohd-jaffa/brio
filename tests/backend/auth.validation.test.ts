import { describe, it, expect } from "vitest";
import { generateTemporaryPassword, normalizePhone } from "../../src/features/auth/security";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from "@/lib/validation";

describe("auth validation", () => {
  it("normalizes phone numbers before validation", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("+919876543210");

    const parsed = loginSchema.parse({
      phone: "+91 98765-43210",
      password: "correct-password",
    });

    expect(parsed.phone).toBe("+919876543210");
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
