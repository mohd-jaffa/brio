import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { AUTH_ROUTES, HOME_ROUTE } from "@/constants/routes";
import { REFRESH_TOKEN_COOKIE } from "@/features/auth/cookies";

import { config, proxy } from "@/proxy";

function visit(path: string, { signedIn = false } = {}) {
  const request = new NextRequest(new URL(path, "https://ovenly.test"));
  if (signedIn) request.cookies.set(REFRESH_TOKEN_COOKIE, "refresh-token");
  return proxy(request);
}

function destinationOf(response: Response): string | null {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname + new URL(location).search : null;
}

describe("a signed-out visitor", () => {
  it("is sent to sign in, and told where they were going", () => {
    expect(destinationOf(visit("/orders?status=PENDING"))).toBe(
      "/login?next=%2Forders%3Fstatus%3DPENDING",
    );
  });

  it("reaches the screens that exist before a session does", () => {
    for (const path of [AUTH_ROUTES.signIn, AUTH_ROUTES.register, AUTH_ROUTES.forgotPassword]) {
      expect(destinationOf(visit(path))).toBeNull();
    }
  });

  it("cannot reach the change-password screen without one", () => {
    expect(destinationOf(visit(AUTH_ROUTES.changePassword))).toBe("/login?next=%2Fchange-password");
  });
});

describe("a signed-in baker", () => {
  it("goes about the app untouched", () => {
    expect(destinationOf(visit("/orders", { signedIn: true }))).toBeNull();
  });

  it("is sent on from the sign-in screen rather than shown it again", () => {
    expect(destinationOf(visit(AUTH_ROUTES.signIn, { signedIn: true }))).toBe(HOME_ROUTE);
  });

  it("lands back where they were headed before signing in", () => {
    expect(destinationOf(visit("/login?next=%2Fcustomers", { signedIn: true }))).toBe("/customers");
  });

  it("is not carried off to another site by a crafted link", () => {
    expect(destinationOf(visit("/login?next=https%3A%2F%2Felsewhere.example", { signedIn: true }))).toBe(
      HOME_ROUTE,
    );
  });

  it("may still change a temporary password and confirm an email", () => {
    expect(destinationOf(visit(AUTH_ROUTES.changePassword, { signedIn: true }))).toBeNull();
    expect(destinationOf(visit(AUTH_ROUTES.confirmEmail, { signedIn: true }))).toBeNull();
  });
});

describe("what the proxy runs on", () => {
  it("leaves the API, Next's assets and the metadata files alone", () => {
    const [matcher] = config.matcher;
    const pattern = new RegExp(`^${matcher}$`);

    expect(pattern.test("/api/orders")).toBe(false);
    expect(pattern.test("/_next/static/chunk.js")).toBe(false);
    expect(pattern.test("/favicon.ico")).toBe(false);
    expect(pattern.test("/orders")).toBe(true);
  });
});
