import { describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({ CRON_SECRET: undefined as string | undefined }));
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => env }));

import { assertCronRequest } from "@/lib/api/cron";

const SECRET = "a".repeat(64);
const asking = (authorization?: string) =>
  new Request("https://app.test/api/cron/due-orders", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });

describe("assertCronRequest", () => {
  it("lets the scheduler in with its secret", () => {
    expect(() => assertCronRequest(asking(`Bearer ${SECRET}`), SECRET)).not.toThrow();
  });

  it.each([
    ["no header", undefined],
    ["another secret", `Bearer ${"b".repeat(64)}`],
    ["a shorter one", `Bearer ${"a".repeat(63)}`],
    ["the secret, not as a bearer token", SECRET],
  ])("refuses %s", (_, authorization) => {
    expect(() => assertCronRequest(asking(authorization), SECRET)).toThrow(
      expect.objectContaining({ code: "CRON_UNAUTHORIZED" }),
    );
  });

  it("reads the secret from the environment, and refuses everyone while none is set: the route is closed", () => {
    env.CRON_SECRET = SECRET;
    expect(() => assertCronRequest(asking(`Bearer ${SECRET}`))).not.toThrow();
    env.CRON_SECRET = undefined;
    expect(() => assertCronRequest(asking("Bearer "))).toThrow(expect.objectContaining({ code: "CRON_UNAUTHORIZED" }));
    expect(() => assertCronRequest(asking(`Bearer ${SECRET}`))).toThrow(
      expect.objectContaining({ code: "CRON_UNAUTHORIZED" }),
    );
  });
});
