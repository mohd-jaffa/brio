import { describe, expect, it } from "vitest";

import {
  AUTH_ROUTES,
  HOME_ROUTE,
  isPublicPath,
  isSignedInPath,
  returnToPath,
  signInPath,
} from "@/constants/routes";

describe("which screens need a session", () => {
  it("lets a signed-out visitor reach sign-in, register, reset and confirmation", () => {
    expect(isPublicPath(AUTH_ROUTES.signIn)).toBe(true);
    expect(isPublicPath(AUTH_ROUTES.register)).toBe(true);
    expect(isPublicPath(AUTH_ROUTES.forgotPassword)).toBe(true);
    expect(isPublicPath(AUTH_ROUTES.confirmEmail)).toBe(true);
  });

  it("keeps every business screen behind a session", () => {
    for (const path of [HOME_ROUTE, "/orders", "/customers/abc", "/settings"]) {
      expect(isPublicPath(path)).toBe(false);
    }
  });

  it("does not treat changing a password as a screen to bounce a signed-in baker off", () => {
    expect(isSignedInPath(AUTH_ROUTES.changePassword)).toBe(true);
    expect(isSignedInPath(AUTH_ROUTES.signIn)).toBe(false);
  });
});

describe("the sign-in detour", () => {
  it("remembers where the visitor was heading", () => {
    expect(signInPath("/orders/o-1")).toBe("/login?next=%2Forders%2Fo-1");
  });

  it("does not bother remembering the dashboard", () => {
    expect(signInPath(HOME_ROUTE)).toBe(AUTH_ROUTES.signIn);
    expect(signInPath(null)).toBe(AUTH_ROUTES.signIn);
  });

  it("returns them to where they were", () => {
    expect(returnToPath("/expenses?month=2026-09")).toBe("/expenses?month=2026-09");
  });

  it("refuses to be turned into a redirect to another site", () => {
    expect(returnToPath("https://elsewhere.example/steal")).toBe(HOME_ROUTE);
    expect(returnToPath("//elsewhere.example/steal")).toBe(HOME_ROUTE);
  });

  it("never sends a baker who just signed in back to sign-in", () => {
    expect(returnToPath(AUTH_ROUTES.signIn)).toBe(HOME_ROUTE);
    expect(returnToPath(`${AUTH_ROUTES.register}?x=1`)).toBe(HOME_ROUTE);
    expect(returnToPath(null)).toBe(HOME_ROUTE);
  });
});
