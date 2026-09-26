"use client";

import { useEffect, useRef, type RefObject } from "react";

// Kept in step with --ease-out-expo in globals.css.
const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * Moves a region in from the side it is travelling towards when `position`
 * changes — the steps of a new order: forward from the right, back from the
 * left — so the way back is where it looks to be. Nothing moves on the first
 * render, nothing while the `stillWhen` media query matches (a wide screen
 * that shows every step at once), and under reduced motion it only fades. Web Animations, not a class,
 * so it replays without remounting what is inside.
 */
export function useTravelMotion(ref: RefObject<HTMLElement | null>, position: number, stillWhen?: string) {
  const last = useRef(position);
  useEffect(() => {
    const from = last.current;
    last.current = position;
    const region = ref.current;
    if (from === position || !region || typeof region.animate !== "function") return;
    const matches = (query: string) => window.matchMedia?.(query).matches === true;
    if (stillWhen && matches(stillWhen)) return;
    const reduce = matches("(prefers-reduced-motion: reduce)");
    const offset = position > from ? 24 : -24;
    region.animate(
      reduce
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: `translateX(${offset}px)` },
            { opacity: 1, transform: "none" },
          ],
      { duration: reduce ? 160 : 300, easing: EASE_OUT_EXPO },
    );
  }, [ref, position, stillWhen]);
}
