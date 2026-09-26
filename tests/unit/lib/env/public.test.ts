import { afterEach, describe, expect, it, vi } from "vitest";

import { publicAppUrl } from "@/lib/env/public";

afterEach(() => vi.unstubAllEnvs());

describe("publicAppUrl", () => {
  it("is the app's web root as the build wrote it, or nothing", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://ovenly.app");
    expect(publicAppUrl()).toBe("https://ovenly.app");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", undefined);
    expect(publicAppUrl()).toBe("");
  });
});
