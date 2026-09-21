import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateTemporaryPassword, normalizePhone } from "../../src/modules/auth/auth.security";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from "../../src/modules/auth/auth.validation";

describe("auth validation", () => {
  it("normalizes phone numbers before validation", () => {
    assert.equal(normalizePhone("+91 98765-43210"), "+919876543210");

    const parsed = loginSchema.parse({
      phone: "+91 98765-43210",
      password: "correct-password",
    });

    assert.equal(parsed.phone, "+919876543210");
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

    assert.equal(parsed.email, "asha@example.com");
    assert.equal(parsed.phone, "+919876543210");
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

    assert.equal(result.success, false);
  });

  it("rejects mismatched forced password changes", () => {
    const result = changePasswordSchema.safeParse({
      newPassword: "new-secret",
      confirmPassword: "another-secret",
    });

    assert.equal(result.success, false);
  });

  it("generates temporary passwords without logging or returning static values", () => {
    const first = generateTemporaryPassword();
    const second = generateTemporaryPassword();

    assert.equal(first.length, 12);
    assert.equal(second.length, 12);
    assert.notEqual(first, second);
    assert.match(first, /^[A-Za-z0-9]+$/);
  });
});
