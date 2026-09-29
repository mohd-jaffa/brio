import { describe, expect, it, vi } from "vitest";

import { authenticationError } from "@/lib/errors";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/features/auth/cookies";
import type { AuthenticatedSession } from "@/features/auth/types";

// The route helper only needs the shape of a session; building a real one
// would drag in Supabase and the mail service for no gain.
vi.mock("@/features/auth/api", () => ({
  toSessionView: (session: AuthenticatedSession) => ({
    profile: session.profile,
    requiresPasswordChange: session.requiresPasswordChange,
  }),
}));

const { endingSession, withSessionRoute, withSignOutRoute } = await import("@/features/auth/route");

const session: AuthenticatedSession = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  profile: {
    id: "u-1",
    phone: "+919876543210",
    email: "asha@example.com",
    name: "Asha",
    avatar: "husky",
    role: "USER",
    bakeryId: "b-1",
    isActive: true,
    mustChangePassword: false,
    emailConfirmedAt: null,
    nameChangedAt: null,
    phoneChangedAt: null,
    emailChangedAt: null,
    pendingEmail: null,
  },
  requiresPasswordChange: false,
};

const request = () => new Request("https://brio.test/api/auth/login", { method: "POST" });

describe("a route that issues a session", () => {
  it("sets both cookies", async () => {
    const response = await withSessionRoute(request(), async () => session);
    const cookies = response.headers.getSetCookie().join("\n");

    expect(cookies).toContain(`${ACCESS_TOKEN_COOKIE}=access-token`);
    expect(cookies).toContain(`${REFRESH_TOKEN_COOKIE}=refresh-token`);
  });

  it("answers with the profile and not with the tokens", async () => {
    const response = await withSessionRoute(request(), async () => session);
    const body = (await response.json()) as { data: Record<string, unknown> };

    expect(body.data).toEqual({ profile: session.profile, requiresPasswordChange: false });
    expect(JSON.stringify(body)).not.toContain("access-token");
    expect(JSON.stringify(body)).not.toContain("refresh-token");
  });

  it("sets no cookie when the sign-in was refused", async () => {
    const response = await withSessionRoute(request(), async () => {
      throw authenticationError("AUTH_INVALID_CREDENTIALS");
    });

    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie()).toHaveLength(0);
  });
});

describe("a route that ends a session", () => {
  it("expires both cookies", async () => {
    const response = await withSignOutRoute(request(), async () => ({ signedOut: true }));
    const cookies = response.headers.getSetCookie();

    expect(cookies).toHaveLength(2);
    expect(cookies.every((cookie) => cookie.includes("Max-Age=0"))).toBe(true);
  });

  it("expires them even when the handler failed, because the caller wanted out", async () => {
    const response = await withSignOutRoute(request(), async () => {
      throw authenticationError("AUTH_SESSION_INVALID");
    });

    expect(response.headers.getSetCookie()).toHaveLength(2);
  });
});

describe("endingSession", () => {
  it("expires the session's cookies once the account is gone", () => {
    const cookies = endingSession(Response.json({ success: true }, { status: 200 })).headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    expect(cookies.every((cookie) => cookie.includes("Max-Age=0"))).toBe(true);
  });

  it("keeps them when it was refused, so the owner can try again signed in", () => {
    const refused = Response.json({ success: false }, { status: 400 });
    expect(endingSession(refused).headers.getSetCookie()).toEqual([]);
  });
});
