import { afterEach, describe, expect, it, vi } from "vitest";

import { publicAppUrl, publicAppVersion, publicVapidKey } from "@/lib/env/public";

afterEach(() => vi.unstubAllEnvs());

describe("publicAppUrl", () => {
  it("is the app's web root as the build wrote it, or nothing", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://brio.app");
    expect(publicAppUrl()).toBe("https://brio.app");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", undefined);
    expect(publicAppUrl()).toBe("");
  });
});

describe("publicAppVersion", () => {
  it("is the version the build wrote, or nothing", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "0.1.0");
    expect(publicAppVersion()).toBe("0.1.0");
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", undefined);
    expect(publicAppVersion()).toBe("");
  });
});

describe("publicVapidKey", () => {
  it("is the public web push key the build wrote, or nothing: web push is then off", () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "BPublic");
    expect(publicVapidKey()).toBe("BPublic");
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", undefined);
    expect(publicVapidKey()).toBe("");
  });
});
