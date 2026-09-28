import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { assetUrl, LAUNCH, launchBootScript } from "@/lib/launch/splash";

const SCRIPT = launchBootScript({ portrait: "/p.webp", landscape: "/l.webp", wordmark: "/w.webp" });
const root = document.documentElement;
const agent = navigator.userAgent;

let frames: FrameRequestCallback[];
let images: { src: string; onload: (() => void) | null; onerror: (() => void) | null }[];
let fontsReady: { resolve: () => void; reject: () => void };

/** Runs the script as the page's <head> would, with the launch's steps in the test's hands. */
function boot({ standalone = false, landscape = false, userAgent = agent } = {}) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("standalone") ? standalone : query.includes("landscape") ? landscape : false,
    }),
  });
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
  new Function(SCRIPT)();
}

/** Lets the bar run for `ms`, a frame every 16 ms. */
function run(ms: number) {
  for (let t = 0; t < ms; t += 16) {
    vi.advanceTimersByTime(16);
    const pending = frames.splice(0);
    pending.forEach((frame) => frame(0));
  }
}

function splash() {
  document.body.innerHTML = `<div id="${LAUNCH.id}"><div id="${LAUNCH.id}-track" aria-valuenow="0"><span id="${LAUNCH.id}-bar"></span></div></div>`;
}

beforeEach(() => {
  vi.useFakeTimers();
  frames = [];
  images = [];
  window.sessionStorage.clear();
  root.removeAttribute("data-launch");
  delete window.__ovenlyLaunch;
  splash();
  vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => frames.push(frame));
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        images.push(this);
      }
    },
  );
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: {
      ready: new Promise<void>((resolve, reject) => {
        fontsReady = { resolve, reject: () => reject(new Error("no fonts")) };
      }),
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  root.removeAttribute("data-launch");
});

describe("assetUrl", () => {
  it("reads an image's address from Next's loader, or takes a plain path as it is", () => {
    expect(assetUrl({ src: "/_next/static/media/a.webp", width: 1, height: 1 })).toBe("/_next/static/media/a.webp");
    expect(assetUrl("/a.webp")).toBe("/a.webp");
  });
});

describe("the launch script", () => {
  it("does nothing in a browser tab", () => {
    boot();
    expect(root).not.toHaveAttribute("data-launch");
    expect(window.__ovenlyLaunch).toBeUndefined();
    expect(images).toHaveLength(0);
  });

  it("shows the splash when the Android app launches, and loads its art for the screen's shape", () => {
    boot({ userAgent: `${agent} BrioAndroid` });
    expect(root).toHaveAttribute("data-launch", "on");
    expect(images.map((image) => image.src)).toEqual(["/p.webp", "/w.webp"]);
    expect(window.sessionStorage.getItem(LAUNCH.key)).toBe("1");
  });

  it("shows it when the installed web app launches, with the landscape art on a screen on its side", () => {
    boot({ standalone: true, landscape: true });
    expect(root).toHaveAttribute("data-launch", "on");
    expect(images[0].src).toBe("/l.webp");
  });

  it("shows once a launch: a reload in the same launch goes straight to the page", () => {
    window.sessionStorage.setItem(LAUNCH.key, "1");
    boot({ standalone: true });
    expect(root).not.toHaveAttribute("data-launch");
  });

  it("fills as the launch goes, never past a step not yet reached, then fades and is gone", async () => {
    boot({ standalone: true });
    const track = document.getElementById(`${LAUNCH.id}-track`)!;
    const bar = document.getElementById(`${LAUNCH.id}-bar`)!;
    const shown = () => Number(track.getAttribute("aria-valuenow"));

    // The page is read already (jsdom's document has loaded): 30 %, and a little beyond.
    run(600);
    expect(shown()).toBeGreaterThanOrEqual(30);
    expect(shown()).toBeLessThanOrEqual(34);
    expect(bar.style.transform).toMatch(/^scaleX\(0\.3/);

    images[0].onload!();
    fontsReady.resolve();
    await Promise.resolve();
    run(600);
    expect(shown()).toBeGreaterThan(60);
    expect(shown()).toBeLessThanOrEqual(69);

    window.__ovenlyLaunch!.ready();
    window.__ovenlyLaunch!.ready();
    run(600);
    expect(shown()).toBe(100);
    expect(root).toHaveAttribute("data-launch", "leaving");
    vi.advanceTimersByTime(LAUNCH.fade);
    expect(root).not.toHaveAttribute("data-launch");
  });

  it("waits out its shortest time even when the launch is quicker, and counts failed art and fonts as done", async () => {
    boot({ standalone: true });
    images[0].onerror!();
    fontsReady.reject();
    await Promise.resolve();
    await Promise.resolve();
    window.__ovenlyLaunch!.ready();
    run(LAUNCH.min - 200);
    expect(root).toHaveAttribute("data-launch", "on");
    run(400);
    expect(root).toHaveAttribute("data-launch", "leaving");
  });

  it("gives up waiting after its longest time", () => {
    boot({ standalone: true });
    run(LAUNCH.max + 100);
    expect(root).toHaveAttribute("data-launch", "leaving");
  });

  it("counts the page as read once it is, and the fonts at once where they cannot be told", () => {
    Object.defineProperty(document, "readyState", { configurable: true, value: "loading" });
    Object.defineProperty(document, "fonts", { configurable: true, value: undefined });
    boot({ standalone: true });
    run(300);
    expect(Number(document.getElementById(`${LAUNCH.id}-track`)!.getAttribute("aria-valuenow"))).toBeLessThanOrEqual(19);
    document.dispatchEvent(new Event("DOMContentLoaded"));
    run(600);
    expect(Number(document.getElementById(`${LAUNCH.id}-track`)!.getAttribute("aria-valuenow"))).toBeGreaterThanOrEqual(45);
    Reflect.deleteProperty(document, "readyState");
  });

  it("keeps going without session storage, and without a splash to move", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    document.body.innerHTML = "";
    boot({ standalone: true });
    expect(root).toHaveAttribute("data-launch", "on");
    run(LAUNCH.max + 100);
    expect(root).toHaveAttribute("data-launch", "leaving");
  });

  it("never leaves the page covered when something fails", () => {
    vi.stubGlobal("Image", class {
      constructor() {
        throw new Error("no images");
      }
    });
    boot({ standalone: true });
    expect(root).not.toHaveAttribute("data-launch");
  });
});
