import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AUTH_ROUTES, HOME_ROUTE } from "@/constants/routes";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/features/auth/cookies";

const { renewSession } = vi.hoisted(() => ({ renewSession: vi.fn() }));
vi.mock("@/features/auth/renew", () => ({ renewSession }));

const { config, proxy } = await import("@/proxy");

beforeEach(() => {
  renewSession.mockReset();
  renewSession.mockResolvedValue(NextResponse.next());
});

/** A signed-in visit carries both cookies; `expired` leaves the access token's out, as the browser does once it runs out. */
function visit(path: string, { signedIn = false, expired = false } = {}) {
  const request = new NextRequest(new URL(path, "https://ovenly.test"));
  if (signedIn) {
    request.cookies.set(REFRESH_TOKEN_COOKIE, "refresh-token");
    if (!expired) request.cookies.set(ACCESS_TOKEN_COOKIE, "access-token");
  }
  return proxy(request);
}

function destinationOf(response: Response): string | null {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname + new URL(location).search : null;
}

describe("a signed-out visitor", () => {
  it("is sent to sign in, and told where they were going", async () => {
    expect(destinationOf(await visit("/orders?status=PENDING"))).toBe(
      "/login?next=%2Forders%3Fstatus%3DPENDING",
    );
  });

  it("reaches the screens that exist before a session does", async () => {
    for (const path of [AUTH_ROUTES.signIn, AUTH_ROUTES.register, AUTH_ROUTES.forgotPassword]) {
      expect(destinationOf(await visit(path))).toBeNull();
    }
  });

  it("cannot reach the change-password screen without one", async () => {
    expect(destinationOf(await visit(AUTH_ROUTES.changePassword))).toBe("/login?next=%2Fchange-password");
  });
});

describe("a signed-in baker", () => {
  it("goes about the app untouched", async () => {
    expect(destinationOf(await visit("/orders", { signedIn: true }))).toBeNull();
  });

  it("is sent on from the sign-in screen rather than shown it again", async () => {
    expect(destinationOf(await visit(AUTH_ROUTES.signIn, { signedIn: true }))).toBe(HOME_ROUTE);
  });

  it("lands back where they were headed before signing in", async () => {
    expect(destinationOf(await visit("/login?next=%2Fcustomers", { signedIn: true }))).toBe("/customers");
  });

  it("is not carried off to another site by a crafted link", async () => {
    expect(destinationOf(await visit("/login?next=https%3A%2F%2Felsewhere.example", { signedIn: true }))).toBe(
      HOME_ROUTE,
    );
  });

  it("may still change a temporary password and confirm an email", async () => {
    expect(destinationOf(await visit(AUTH_ROUTES.changePassword, { signedIn: true }))).toBeNull();
    expect(destinationOf(await visit(AUTH_ROUTES.confirmEmail, { signedIn: true }))).toBeNull();
  });
});

describe("a signed-in baker whose access token has run out", () => {
  it("has the session renewed before the screen is drawn, with its data", async () => {
    await visit("/orders", { signedIn: true, expired: true });
    expect(renewSession).toHaveBeenCalledWith(expect.any(NextRequest), "refresh-token");
  });

  it("is not renewed while the access token lasts, nor on a screen that needs no session", async () => {
    await visit("/orders", { signedIn: true });
    await visit(AUTH_ROUTES.confirmEmail, { signedIn: true, expired: true });
    expect(renewSession).not.toHaveBeenCalled();
  });
});

describe("what the proxy runs on", () => {
  it("leaves the API, Next's assets, the bill's fonts and the metadata files alone", () => {
    const [matcher] = config.matcher;
    const pattern = new RegExp(`^${matcher}$`);

    expect(pattern.test("/api/orders")).toBe(false);
    expect(pattern.test("/_next/static/chunk.js")).toBe(false);
    expect(pattern.test("/favicon.ico")).toBe(false);
    expect(pattern.test("/fonts/bill/Inter-Regular.ttf")).toBe(false);
    expect(pattern.test("/orders")).toBe(true);
  });
});
