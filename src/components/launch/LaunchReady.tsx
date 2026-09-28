"use client";

import { useEffect } from "react";

/**
 * Tells the launch splash the app has come to life — the last step its bar
 * waits for (`launchBootScript`). Mounted once, in the root layout: its effect
 * runs when the page has hydrated. Outside a launch there is nothing to tell.
 */
export function LaunchReady() {
  useEffect(() => {
    window.__ovenlyLaunch?.ready();
  }, []);
  return null;
}
