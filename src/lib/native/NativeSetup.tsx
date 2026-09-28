"use client";

import { useEffect } from "react";

import { goBack } from "./back";
import { hasPlugins } from "./platform";

/**
 * What the Android app sets up once it has loaded (plan §139.17.3): the back
 * button, stepping through `goBack` and leaving the app where there is nowhere
 * else to go. In a browser it does nothing. Mounted once, in the root layout.
 */
export function NativeSetup() {
  useEffect(() => {
    if (!hasPlugins("App")) return;
    let stop: (() => void) | undefined;
    let gone = false;
    void import("@capacitor/app").then(async ({ App }) => {
      const listener = await App.addListener("backButton", ({ canGoBack }) => {
        if (goBack(canGoBack) === "LEAVE") void App.exitApp();
      });
      if (gone) void listener.remove();
      else stop = () => void listener.remove();
    });
    return () => {
      gone = true;
      stop?.();
    };
  }, []);
  return null;
}
