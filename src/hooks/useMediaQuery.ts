"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether a media query matches, kept current as the window changes — for what
 * CSS cannot decide, such as whether a chart draws the period before (plan
 * §139.10: on a desktop only). It reads false until the page is in a browser.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (changed) => {
      const list = window.matchMedia?.(query);
      list?.addEventListener("change", changed);
      return () => list?.removeEventListener("change", changed);
    },
    () => window.matchMedia?.(query).matches === true,
    () => false,
  );
}
