import { describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";

import { ACCESS_TOKEN_COOKIE } from "@/features/auth/cookies";
import type { AuthProfile, AuthenticatedSession } from "@/features/auth/types";

// The guard reaches for a session and for Supabase clients; neither is what
// these cases are about, and neither should need configuration to run.
const { getSession, anonClient, serviceClient, captureError } = vi.hoisted(() => ({
  getSession: vi.fn(),
  captureError: vi.fn(),
  anonClient: { anon: true },
  serviceClient: { service: true },
}));
vi.mock("@/features/auth/api", () => ({ getSession }));
vi.mock("@/lib/audit/errorLog", () => ({ captureError }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAnonClient: vi.fn(() => anonClient),
  createSupabaseServiceRoleClient: vi.fn(() => serviceClient),
}));

const {
  assertPasswordChanged,
  assertRole,
  bearerToken,
  businessOf,
  readAccessToken,
  withAccountRoute,
  withBakeryRoute,
  withDevRoute,
} = await import("@/features/auth/guard");

const profile = (role: AuthProfile["role"]): AuthProfile => ({
  id: "u-1",
  phone: "+919876543210",
  email: "asha@example.com",
  name: "Asha",
  avatar: "husky",
  role,
  bakeryId: "b-1",
  isActive: true,
  mustChangePassword: false,
  emailConfirmedAt: null,
  nameChangedAt: null,
  phoneChangedAt: null,
  emailChangedAt: null,
  pendingEmail: null,
  welcomedAt: null,
});

function requestWith(headers: Record<string, string>) {
  return new Request("https://brio.test/api/orders", { headers });
}

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof AppError ? error.code : "NOT_AN_APP_ERROR";
  }
  return "NOTHING_THROWN";
}

describe("the token behind a request", () => {
  it("reads an Authorization header", () => {
    expect(bearerToken(new Headers({ authorization: "Bearer abc" }))).toBe("abc");
    expect(bearerToken(new Headers({ authorization: "bearer abc" }))).toBe("abc");
  });

  it("ignores a header that is not a bearer token", () => {
    expect(bearerToken(new Headers({ authorization: "Basic abc" }))).toBeNull();
    expect(bearerToken(new Headers({ authorization: "Bearer" }))).toBeNull();
    expect(bearerToken(new Headers())).toBeNull();
  });

  it("falls back to the session cookie the browser sends", () => {
    expect(readAccessToken(requestWith({ cookie: `${ACCESS_TOKEN_COOKIE}=from-cookie` }))).toBe("from-cookie");
  });

  it("prefers an explicit bearer token over the cookie", () => {
    const request = requestWith({
      authorization: "Bearer from-header",
      cookie: `${ACCESS_TOKEN_COOKIE}=from-cookie`,
    });

    expect(readAccessToken(request)).toBe("from-header");
  });

  it("refuses a request carrying neither", () => {
    expect(codeOf(() => readAccessToken(requestWith({})))).toBe("AUTH_SESSION_REQUIRED");
  });
});

describe("what a role may do", () => {
  it("lets through a role the route serves", () => {
    expect(() => assertRole(profile("USER"), ["USER"])).not.toThrow();
  });

  it("refuses a role the route does not serve, so DEV does not inherit business data", () => {
    expect(codeOf(() => assertRole(profile("DEV"), ["USER"]))).toBe("AUTH_ROLE_FORBIDDEN");
  });

  it("has no default that would let everyone through", () => {
    expect(codeOf(() => assertRole(profile("USER"), []))).toBe("AUTH_ROLE_FORBIDDEN");
  });
});

describe("a temporary password still in use", () => {
  const session = (requiresPasswordChange: boolean): AuthenticatedSession => ({
    accessToken: "t",
    refreshToken: "",
    expiresAt: null,
    profile: profile("USER"),
    requiresPasswordChange,
  });

  it("is refused everywhere but the screen that replaces it", () => {
    expect(codeOf(() => assertPasswordChanged(session(true)))).toBe("AUTH_PASSWORD_CHANGE_REQUIRED");
  });

  it("stops mattering once the password has been changed", () => {
    expect(() => assertPasswordChanged(session(false))).not.toThrow();
  });
});

describe("a route that changes the owner's own account", () => {
  const signedIn = (requiresPasswordChange = false): AuthenticatedSession => ({
    accessToken: "t",
    refreshToken: "",
    expiresAt: null,
    profile: profile("USER"),
    requiresPasswordChange,
  });
  const call = () => new Request("https://brio.test/api/auth/name", { headers: { authorization: "Bearer t" } });

  it("hands over the session, the tenant and the server's client", async () => {
    getSession.mockResolvedValue(signedIn());
    const response = await withAccountRoute(call(), async (context) => ({
      actor: context.actorId,
      bakery: context.bakeryId,
      user: context.supabase === (anonClient as unknown),
      server: context.admin === (serviceClient as unknown),
    }));
    expect(await response.json()).toMatchObject({
      success: true,
      data: { actor: "u-1", bakery: "b-1", user: true, server: true },
    });
  });

  it("refuses anyone still owing a password change, and a role it does not serve", async () => {
    getSession.mockResolvedValue(signedIn(true));
    const handler = vi.fn();
    expect((await (await withAccountRoute(call(), handler)).json()).error.code).toBe("AUTH_PASSWORD_CHANGE_REQUIRED");
    getSession.mockResolvedValue({ ...signedIn(), profile: profile("DEV") });
    expect((await (await withAccountRoute(call(), handler)).json()).error.code).toBe("AUTH_ROLE_FORBIDDEN");
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("the business an owner acts for", () => {
  it("is the profile's own, and a profile without one is not served", () => {
    expect(businessOf(profile("USER"))).toBe("b-1");
    expect(codeOf(() => businessOf({ ...profile("DEV"), bakeryId: null }))).toBe("AUTH_ROLE_FORBIDDEN");
  });

  it("is never missing from a business route: one without it is refused before the handler", async () => {
    getSession.mockResolvedValue({
      accessToken: "t",
      refreshToken: "",
      expiresAt: null,
      profile: { ...profile("USER"), bakeryId: null },
      requiresPasswordChange: false,
    });
    const handler = vi.fn();
    const answer = await (await withBakeryRoute(requestWith({ authorization: "Bearer t" }), handler)).json();
    expect(answer.error.code).toBe("AUTH_ROLE_FORBIDDEN");
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("a developer console route (plan §37)", () => {
  const signedIn = (role: AuthProfile["role"], requiresPasswordChange = false): AuthenticatedSession => ({
    accessToken: "t",
    refreshToken: "",
    expiresAt: null,
    profile: { ...profile(role), bakeryId: role === "DEV" ? null : "b-1" },
    requiresPasswordChange,
  });
  const call = () => new Request("https://brio.test/api/admin/overview", { headers: { authorization: "Bearer t" } });

  it("serves a developer, handing over the session and the server's client to read with", async () => {
    getSession.mockResolvedValue(signedIn("DEV"));
    const response = await withDevRoute(call(), async (context) => ({
      who: context.session.profile.id,
      server: context.admin === (serviceClient as unknown),
      request: context.requestId.startsWith("req_"),
    }));
    expect(await response.json()).toMatchObject({ success: true, data: { who: "u-1", server: true, request: true } });
  });

  it("names who was asking in the error log when a route fails", async () => {
    getSession.mockResolvedValue(signedIn("DEV"));
    await withDevRoute(call(), async () => {
      throw new Error("down");
    });
    expect(captureError).toHaveBeenLastCalledWith(expect.objectContaining({ userId: "u-1", bakeryId: null }));

    getSession.mockResolvedValue(signedIn("USER"));
    for (const route of [withBakeryRoute, withAccountRoute]) {
      await route(call(), async () => {
        throw new Error("down");
      });
      expect(captureError).toHaveBeenLastCalledWith(expect.objectContaining({ userId: "u-1", bakeryId: "b-1" }));
    }
  });

  it("refuses an owner, and a developer still owing a password change", async () => {
    const handler = vi.fn();
    getSession.mockResolvedValue(signedIn("USER"));
    expect((await (await withDevRoute(call(), handler)).json()).error.code).toBe("AUTH_ROLE_FORBIDDEN");
    getSession.mockResolvedValue(signedIn("DEV", true));
    expect((await (await withDevRoute(call(), handler)).json()).error.code).toBe("AUTH_PASSWORD_CHANGE_REQUIRED");
    expect(handler).not.toHaveBeenCalled();
  });
});
