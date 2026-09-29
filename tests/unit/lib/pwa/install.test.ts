import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  installPlatform,
  installState,
  listenForInstall,
  promptInstall,
  resetInstall,
  runningInstalled,
  subscribeInstall,
  UNKNOWN,
} from "@/lib/pwa/install";

/** The browser's own offer to install, as Chrome fires it. */
function anOffer(outcome: "accepted" | "dismissed") {
  const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: string }>;
  };
  event.prompt = vi.fn(async () => {});
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

/** How the page was opened, as `matchMedia` answers it; none at all where the browser has none. */
function standalone(matches: boolean | "unsupported") {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value:
      matches === "unsupported"
        ? undefined
        : (query: string) =>
            ({ matches: matches && query === "(display-mode: standalone)", media: query }) as MediaQueryList,
  });
}

let stop: () => void = () => {};

beforeEach(() => {
  resetInstall();
  standalone(false);
});

afterEach(() => {
  stop();
  vi.restoreAllMocks();
  delete (navigator as Navigator & { standalone?: boolean }).standalone;
});

describe("whether the app is running installed", () => {
  it("is standalone, or Safari's own flag on iOS", () => {
    expect(runningInstalled()).toBe(false);
    standalone(true);
    expect(runningInstalled()).toBe(true);
    standalone(false);
    (navigator as Navigator & { standalone?: boolean }).standalone = true;
    expect(runningInstalled()).toBe(true);
  });

  it("is not, where the browser cannot say", () => {
    standalone("unsupported");
    expect(runningInstalled()).toBe(false);
  });
});

describe("the install state", () => {
  it("is unknown until the page listens, and then says how the app was opened", () => {
    expect(installState()).toBe(UNKNOWN);
    stop = listenForInstall();
    expect(installState()).toEqual({ known: true, installed: false, canPrompt: false });
  });

  it("keeps the browser's offer for the owner to ask for, instead of the browser showing it", () => {
    const told = vi.fn();
    const unsubscribe = subscribeInstall(told);
    stop = listenForInstall();
    const offer = anOffer("accepted");
    window.dispatchEvent(offer);

    expect(offer.defaultPrevented).toBe(true);
    expect(installState()).toEqual({ known: true, installed: false, canPrompt: true });
    expect(told).toHaveBeenCalled();
    unsubscribe();
  });

  it("knows once the app is installed, and the offer is spent", () => {
    stop = listenForInstall();
    window.dispatchEvent(anOffer("accepted"));
    window.dispatchEvent(new Event("appinstalled"));
    expect(installState()).toEqual({ known: true, installed: true, canPrompt: false });
  });

  it("stops listening when asked", () => {
    listenForInstall()();
    window.dispatchEvent(anOffer("accepted"));
    expect(installState().canPrompt).toBe(false);
  });
});

describe("asking the browser to install", () => {
  it("shows its offer once, and says whether the owner took it", async () => {
    stop = listenForInstall();
    const offer = anOffer("accepted");
    window.dispatchEvent(offer);

    await expect(promptInstall()).resolves.toBe(true);
    expect(offer.prompt).toHaveBeenCalledOnce();
    expect(installState().canPrompt).toBe(false);
    await expect(promptInstall()).resolves.toBe(false);
  });

  it("says so when the owner turned it down", async () => {
    stop = listenForInstall();
    window.dispatchEvent(anOffer("dismissed"));
    await expect(promptInstall()).resolves.toBe(false);
  });
});

describe("whose steps to show", () => {
  const IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1";
  const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15";
  const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36";
  const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36";
  const FIREFOX = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0";

  it("tells an iPhone, an iPad (which calls itself a Mac), Android, a computer and a browser that cannot install", () => {
    expect(installPlatform(IPHONE)).toBe("ios");
    expect(installPlatform(IPAD, 5)).toBe("ios");
    expect(installPlatform(IPAD, 0)).toBe("desktop");
    expect(installPlatform(ANDROID)).toBe("android");
    expect(installPlatform(CHROME)).toBe("desktop");
    expect(installPlatform(FIREFOX)).toBe("other");
  });
});
