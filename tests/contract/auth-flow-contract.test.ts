import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The shape of the authentication surface (plan §7, §19, §94, §95). These are
 * the guarantees no unit test can see, because they are about which module a
 * route goes through rather than what a function returns: that every endpoint
 * the browser calls exists, that the ones needing a session read it the one
 * way, and that no endpoint hands a token back in its body.
 */
const ROUTES = [
  ["register", "register", "POST"],
  ["sign in", "login", "POST"],
  ["sign out", "logout", "POST"],
  ["session", "session", "GET"],
  ["session refresh", "refresh", "POST"],
  ["email confirmation", "confirm", "POST"],
  ["password reset request", "password-reset", "POST"],
  ["password change", "password", "PATCH"],
] as const;

function routeSource(segment: string): string {
  const path = join(process.cwd(), "src/app/api/auth", segment, "route.ts");
  expect(existsSync(path), `${segment} route is missing`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("auth API flow contract", () => {
  for (const [name, segment, method] of ROUTES) {
    it(`exposes ${name} through ${method}`, () => {
      expect(routeSource(segment)).toMatch(new RegExp(`export async function ${method}`));
    });
  }

  it("reads the caller's token one way, so a cookie and a bearer header both work", () => {
    for (const segment of ["session", "password"]) {
      expect(routeSource(segment)).toMatch(/readAccessToken/);
    }
  });

  it("sets the session cookies from the one helper wherever a session is issued", () => {
    for (const segment of ["login", "refresh", "confirm"]) {
      expect(routeSource(segment)).toMatch(/withSessionRoute/);
    }
  });

  it("clears the session cookies when signing out", () => {
    expect(routeSource("logout")).toMatch(/withSignOutRoute/);
  });

  it("keeps tokens out of what the browser is given back", () => {
    const view = readFileSync(join(process.cwd(), "src/features/auth/route.ts"), "utf8");
    expect(view).toMatch(/toSessionView/);

    const types = readFileSync(join(process.cwd(), "src/features/auth/types.ts"), "utf8");
    const sessionView = types.slice(types.indexOf("interface AuthSessionView"));
    expect(sessionView).not.toMatch(/accessToken|refreshToken/);
  });

  it("puts every screen behind the session gate rather than each page remembering", () => {
    const shell = readFileSync(join(process.cwd(), "src/components/nav/AppShell.tsx"), "utf8");
    expect(shell).toMatch(/<RequireAuth>/);
  });
});
