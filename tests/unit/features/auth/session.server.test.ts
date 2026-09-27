import { beforeEach, describe, expect, it, vi } from "vitest";

import { TEST_SESSION } from "@tests/support/auth";

const { jar, getSession } = vi.hoisted(() => ({
  jar: new Map<string, string>(),
  getSession: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    has: (name: string) => jar.has(name),
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServiceRoleClient: () => "service-client" }));
vi.mock("@/features/auth/api", () => ({
  getSession,
  toSessionView: (session: typeof TEST_SESSION & { accessToken: string }) => ({
    profile: session.profile,
    requiresPasswordChange: session.requiresPasswordChange,
  }),
}));

const { readInitialSession } = await import("@/features/auth/session.server");

beforeEach(() => {
  jar.clear();
  getSession.mockReset();
});

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
