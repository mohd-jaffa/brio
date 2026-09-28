import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ android: false }));
vi.mock("@/lib/native", () => ({ isAndroidApp: () => native.android }));

import { useInstallApp } from "@/hooks/useInstallApp";
import { listenForInstall, resetInstall } from "@/lib/pwa/install";

const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36";

let stop: () => void = () => {};

beforeEach(() => {
  native.android = false;
  resetInstall();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({ matches: false, media: query }) as MediaQueryList,
  });
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ANDROID);
});

afterEach(() => {
  stop();
  vi.restoreAllMocks();
});

function Probe() {
  const { offered, platform } = useInstallApp();
  return <p>{`${offered}:${platform}`}</p>;
}

describe("useInstallApp", () => {
  it("offers nothing on the server, which cannot tell how the app was opened", () => {
    expect(renderToString(<Probe />)).toContain("false:other");
  });

  it("offers it in the browser once the page listens, with this device's steps", () => {
    const { result } = renderHook(() => useInstallApp());
    expect(result.current.offered).toBe(false);
    act(() => {
      stop = listenForInstall();
    });
    expect(result.current).toMatchObject({ offered: true, canPrompt: false, platform: "android" });
  });

  it("offers nothing inside the Android app, which is already installed", () => {
    native.android = true;
    const { result } = renderHook(() => useInstallApp());
    act(() => {
      stop = listenForInstall();
    });
    expect(result.current.offered).toBe(false);
  });

  it("offers nothing inside the installed app", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({ matches: query === "(display-mode: standalone)", media: query }) as MediaQueryList,
    });
    const { result } = renderHook(() => useInstallApp());
    act(() => {
      stop = listenForInstall();
    });
    expect(result.current.offered).toBe(false);
  });

  it("knows when the browser will install it itself", () => {
    const { result } = renderHook(() => useInstallApp());
    act(() => {
      stop = listenForInstall();
      const offer = new Event("beforeinstallprompt", { cancelable: true });
      window.dispatchEvent(offer);
    });
    expect(result.current.canPrompt).toBe(true);
  });
});
