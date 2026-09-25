import { describe, expect, it } from "vitest";

import { VALIDATION_MESSAGES } from "@/constants/messages";
import { changePasswordSchema, registerSchema } from "@/lib/validation/schemas/auth";

const you = {
  name: "Asha Baker",
  phone: "98765 43210",
  email: "Asha@Example.com",
  password: "hunter22",
  confirmPassword: "hunter22",
};
const business = { businessName: "Asha Bakes", tagline: "", city: "Pune", address: "12 MG Road\nCamp" };

const issues = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((result.error?.issues ?? []).map((issue) => [issue.path.join("."), issue.message]));

describe("registerSchema", () => {
  it("takes you and your business in one payload, tidied, a blank catch phrase as none (§139.11.2)", () => {
    expect(registerSchema.parse({ ...you, ...business })).toEqual({
      name: "Asha Baker",
      phone: "+919876543210",
      email: "asha@example.com",
      password: "hunter22",
      confirmPassword: "hunter22",
      businessName: "Asha Bakes",
      tagline: null,
      city: "Pune",
      address: "12 MG Road\nCamp",
    });
  });

  it("requires the city and the address, which the bill prints (Q2)", () => {
    expect(issues(registerSchema.safeParse({ ...you, businessName: "Asha Bakes" }))).toEqual({
      city: VALIDATION_MESSAGES.required("City"),
      address: VALIDATION_MESSAGES.required("Address"),
    });
  });

  it("holds the business fields to the same limits as Business details", () => {
    expect(issues(registerSchema.safeParse({ ...you, ...business, tagline: "x".repeat(81), city: "P" }))).toEqual({
      tagline: VALIDATION_MESSAGES.tooLong("Catch phrase", 80),
      city: VALIDATION_MESSAGES.tooShort("City", 2),
    });
  });

  it("says two passwords differ while the business is still empty, so the first step can say so", () => {
    const result = registerSchema.safeParse({ ...you, confirmPassword: "hunter23" });
    expect(issues(result).confirmPassword).toBe(VALIDATION_MESSAGES.passwordsMustMatch);
  });

  it("does not compare passwords that are themselves not valid yet", () => {
    const result = registerSchema.safeParse({ ...you, ...business, password: "short", confirmPassword: "other" });
    expect(issues(result)).toEqual({ password: VALIDATION_MESSAGES.tooShort("Password", 8) });
  });
});

describe("changePasswordSchema", () => {
  it("still asks for the same password twice", () => {
    expect(issues(changePasswordSchema.safeParse({ newPassword: "hunter22", confirmPassword: "hunter23" }))).toEqual({
      confirmPassword: VALIDATION_MESSAGES.passwordsMustMatch,
    });
    expect(changePasswordSchema.safeParse({ newPassword: "hunter22", confirmPassword: "hunter22" }).success).toBe(true);
  });
});
