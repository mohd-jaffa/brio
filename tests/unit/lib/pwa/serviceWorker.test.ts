import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setUpServiceWorker } from "@/lib/pwa/serviceWorker";

const postMessage = vi.fn();
const unregister = vi.fn(async () => true);
const worker = {
  register: vi.fn(async () => ({})),
  ready: Promise.resolve({ active: { postMessage } }),
  getRegistrations: vi.fn(async () => [{ unregister }, { unregister }]),
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "serviceWorker", { value: worker, configurable: true });
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([
    { name: `${window.location.origin}/_next/static/chunks/app.js` },
    { name: `${window.location.origin}/fonts/bill/Inter.ttf` },
    { name: `${window.location.origin}/api/orders` },
    { name: "https://cdn.example.com/_next/static/elsewhere.js" },
  ] as PerformanceEntryList);
});

afterEach(() => {
  Reflect.deleteProperty(navigator, "serviceWorker");
  vi.restoreAllMocks();
});

describe("setUpServiceWorker", () => {
  it("puts the worker in charge in a built app, named for the release", async () => {
    await setUpServiceWorker("0.1.0", true);
    expect(worker.register).toHaveBeenCalledWith("/sw.js?v=0.1.0", { scope: "/" });
  });

  it("hands it the app's own files the page already loaded, and nothing else", async () => {
    await setUpServiceWorker("0.1.0", true);
    expect(postMessage).toHaveBeenCalledWith({
      type: "KEEP_FILES",
      urls: [`${window.location.origin}/_next/static/chunks/app.js`, `${window.location.origin}/fonts/bill/Inter.ttf`],
    });
  });

  it("names a release even when the build gave none", async () => {
    await setUpServiceWorker("", true);
    expect(worker.register).toHaveBeenCalledWith("/sw.js?v=0", { scope: "/" });
  });

  it("takes away any worker left from a build while developing, and registers none", async () => {
    await setUpServiceWorker("0.1.0", false);
    expect(unregister).toHaveBeenCalledTimes(2);
    expect(worker.register).not.toHaveBeenCalled();
  });

  it("does nothing in a browser without service workers", async () => {
    Reflect.deleteProperty(navigator, "serviceWorker");
    await expect(setUpServiceWorker("0.1.0", true)).resolves.toBeUndefined();
    expect(worker.register).not.toHaveBeenCalled();
  });

  it("is in charge only in a build, unless told otherwise", async () => {
    // Vitest runs as "test": this is the development path.
    await setUpServiceWorker("0.1.0");
    expect(worker.register).not.toHaveBeenCalled();
  });
});
