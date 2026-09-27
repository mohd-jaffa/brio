import { beforeEach, describe, expect, it, vi } from "vitest";

import { TEST_SESSION } from "@tests/support/auth";

const { jar, getSession, redirect, warn } = vi.hoisted(() => ({
  jar: new Map<string, string>(),
  getSession: vi.fn(),
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  }),
  warn: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    has: (name: string) => jar.has(name),
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: () => "service-client",
  createSupabaseAnonClient: (token: string) => `client-for-${token}`,
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/logger", () => ({ logger: { warn } }));
// Outside a server render, React's cache is a plain call: each read asks afresh.
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: (fn: unknown) => fn }));
vi.mock("@/features/auth/api", () => ({
  getSession,
  toSessionView: (session: typeof TEST_SESSION & { accessToken: string }) => ({
    profile: session.profile,
    requiresPasswordChange: session.requiresPasswordChange,
  }),
}));

const { readInitialSession, readScreen, requireDeveloperScreen, routeQuery } = await import("@/features/auth/session.server");

beforeEach(() => {
  jar.clear();
  getSession.mockReset();
  redirect.mockClear();
  warn.mockClear();
});

const signedIn = (overrides: Record<string, unknown> = {}) => {
  jar.set("ovenly_access_token", "access-1");
  getSession.mockResolvedValue({
    ...TEST_SESSION,
    accessToken: "access-1",
    refreshToken: "",
    ...overrides,
    profile: { ...TEST_SESSION.profile, ...(overrides.profile as object) },
  });
};

describe("readInitialSession", () => {
  it("knows a visitor with no session cookie is signed out, and asks nobody", async () => {
    expect(await readInitialSession()).toBeNull();
    expect(getSession).not.toHaveBeenCalled();
  });

  it("hands over the session its access token proves, and never the token", async () => {
    jar.set("ovenly_access_token", "access-1");
    jar.set("ovenly_refresh_token", "refresh-1");
    getSession.mockResolvedValue({ ...TEST_SESSION, accessToken: "access-1", refreshToken: "" });

    const view = await readInitialSession();

    expect(getSession).toHaveBeenCalledWith("service-client", "access-1");
    expect(view).toEqual({ profile: TEST_SESSION.profile, requiresPasswordChange: TEST_SESSION.requiresPasswordChange });
    expect(JSON.stringify(view)).not.toContain("access-1");
  });

  it("leaves an expired access token to the browser, which can refresh it", async () => {
    jar.set("ovenly_refresh_token", "refresh-1");
    expect(await readInitialSession()).toBeUndefined();
    expect(getSession).not.toHaveBeenCalled();
  });

  it("leaves a refused token to the browser too, rather than failing the page", async () => {
    jar.set("ovenly_access_token", "stale");
    getSession.mockRejectedValue(new Error("AUTH_SESSION_INVALID"));
    expect(await readInitialSession()).toBeUndefined();
  });
});

describe("readScreen", () => {
  it("reads a screen's first data as its routes would, for the signed-in business, in the shape they send", async () => {
    signedIn();
    const listOrders = vi.fn(async () => ({ items: [{ id: "o-1", dueAt: new Date("2026-09-27T05:00:00Z"), note: undefined }], nextCursor: null }));

    const data = await readScreen({
      queries: { "/api/business": async () => ({ name: "Asha's Kitchen" }) },
      pages: { "/api/orders": listOrders },
    });

    expect(listOrders).toHaveBeenCalledWith({
      supabase: "client-for-access-1",
      bakeryId: TEST_SESSION.profile.bakeryId,
      actorId: TEST_SESSION.profile.id,
    });
    expect(data.queries).toEqual({ "/api/business": { name: "Asha's Kitchen" } });
    // As JSON: the date a string, nothing undefined.
    expect(data.pages["/api/orders"]).toEqual({ items: [{ id: "o-1", dueAt: "2026-09-27T05:00:00.000Z" }], nextCursor: null });
  });

  it("leaves out a read that fails, for the screen to ask for itself", async () => {
    signedIn();
    const data = await readScreen({
      queries: {
        "/api/dashboard": async () => {
          throw new TypeError("offline");
        },
        "/api/business": async () => ({ name: "Asha's Kitchen" }),
      },
    });
    expect(Object.keys(data.queries)).toEqual(["/api/business"]);
    expect(warn).toHaveBeenCalledWith(expect.any(String), { route: "/api/dashboard", reason: "TypeError" });

    await readScreen({
      queries: {
        "/api/dashboard": async () => {
          throw "not an error";
        },
      },
    });
    expect(warn).toHaveBeenLastCalledWith(expect.any(String), { route: "/api/dashboard", reason: "unknown" });
  });

  it("reads nothing without a session the server can use, or for anyone the business routes refuse", async () => {
    const read = vi.fn();
    expect(await readScreen({ queries: { "/api/products": read } })).toEqual({ queries: {}, pages: {} });

    signedIn({ profile: { bakeryId: null } });
    expect(await readScreen({ queries: { "/api/products": read } })).toEqual({ queries: {}, pages: {} });
    expect(read).not.toHaveBeenCalled();
  });

  it("sends a developer to the developer console: a developer has no business to show (plan §37)", async () => {
    const read = vi.fn();
    signedIn({ profile: { role: "DEV", bakeryId: null } });
    await expect(readScreen({ queries: { "/api/products": read } })).rejects.toThrow("NEXT_REDIRECT /admin");
    expect(read).not.toHaveBeenCalled();
  });

  it("sends an owner still holding a temporary password to replace it before anything is drawn", async () => {
    signedIn({ requiresPasswordChange: true });
    await expect(readScreen({})).rejects.toThrow("NEXT_REDIRECT /change-password");
    expect(redirect).toHaveBeenCalledWith("/change-password");
  });
});

describe("requireDeveloperScreen", () => {
  it("lets a developer in", async () => {
    signedIn({ profile: { role: "DEV", bakeryId: null } });
    await expect(requireDeveloperScreen()).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sends an owner home, and a developer owing a password change to replace it", async () => {
    signedIn();
    await expect(requireDeveloperScreen()).rejects.toThrow("NEXT_REDIRECT /");
    signedIn({ requiresPasswordChange: true, profile: { role: "DEV", bakeryId: null } });
    await expect(requireDeveloperScreen()).rejects.toThrow("NEXT_REDIRECT /change-password");
  });

  it("leaves a visitor with no session to the proxy, which sends them to sign in", async () => {
    await expect(requireDeveloperScreen()).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("routeQuery", () => {
  it("parses the query in a route's own address with the route's schema, as the route reads it", () => {
    const schema = { parse: (values: Record<string, string>) => values };
    expect(routeQuery("/api/orders?customer=c-1&search=&customer=c-2", schema)).toEqual({ customer: "c-1" });
    expect(routeQuery("/api/orders", schema)).toEqual({});
  });
});

