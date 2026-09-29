"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { goBack } from "./back";
import { hasPlugins } from "./platform";
import { onReminderTapped } from "./reminders";

/**
 * What the Android app sets up once it has loaded (plan §139.17.3): the back
 * button, stepping through `goBack` and leaving the app where there is nowhere
 * else to go; and a tapped order reminder (R8.6), which opens its order. In a
 * browser it does nothing. Mounted once, in the root layout.
 */
export function NativeSetup() {
  const router = useRouter();

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

  useEffect(() => onReminderTapped((url) => router.push(url)), [router]);

  return null;
}
