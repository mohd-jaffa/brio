import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const routes = [
  ["register", "src/app/api/auth/register/route.ts", "POST"],
  ["login", "src/app/api/auth/login/route.ts", "POST"],
  ["logout", "src/app/api/auth/logout/route.ts", "POST"],
  ["session", "src/app/api/auth/session/route.ts", "GET"],
  ["password reset", "src/app/api/auth/password-reset/route.ts", "POST"],
  ["password change", "src/app/api/auth/password/route.ts", "PATCH"],
] as const;

describe("auth API flow contract", () => {
  for (const [name, routePath, method] of routes) {
    it(`exposes ${name} through ${method}`, () => {
      const absolutePath = join(process.cwd(), routePath);

      assert.equal(existsSync(absolutePath), true);
      assert.match(readFileSync(absolutePath, "utf8"), new RegExp(`export async function ${method}`));
    });
  }

  it("keeps protected routes behind bearer auth", () => {
    const logoutRoute = readFileSync(join(process.cwd(), "src/app/api/auth/logout/route.ts"), "utf8");
    const passwordRoute = readFileSync(join(process.cwd(), "src/app/api/auth/password/route.ts"), "utf8");

    assert.match(logoutRoute, /extractBearerToken/);
    assert.match(passwordRoute, /extractBearerToken/);
  });
});
