import { beforeEach, describe, expect, it, vi } from "vitest";

const core = vi.hoisted(() => ({ native: false, platform: "web", plugins: new Set<string>() }));
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => core.native,
    getPlatform: () => core.platform,
    isPluginAvailable: (name: string) => core.plugins.has(name),
  },
}));

import { hasPlugins, isAndroidApp } from "@/lib/native/platform";

beforeEach(() => {
  Object.assign(core, { native: false, platform: "web", plugins: new Set<string>() });
});

describe("the platform", () => {
  it("is the web in a browser, and the Android app only in its shell on Android", () => {
    expect(isAndroidApp()).toBe(false);
    Object.assign(core, { native: true, platform: "ios" });
    expect(isAndroidApp()).toBe(false);
    Object.assign(core, { native: true, platform: "android" });
    expect(isAndroidApp()).toBe(true);
  });

  it("has a plugin only in the Android app, and only when this build carries every one asked for", () => {
    core.plugins = new Set(["Share", "Filesystem"]);
    expect(hasPlugins("Share")).toBe(false);
    Object.assign(core, { native: true, platform: "android" });
    expect(hasPlugins("Share", "Filesystem")).toBe(true);
    expect(hasPlugins("Share", "App")).toBe(false);
  });
});
