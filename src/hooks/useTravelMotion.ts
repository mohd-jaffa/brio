"use client";

import { useEffect, useRef, type RefObject } from "react";

import { canAnimate, travelIn } from "@/lib/motion";

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
    if (from === position || !canAnimate(region)) return;
    if (stillWhen && window.matchMedia?.(stillWhen).matches === true) return;
    travelIn(region, position > from, 24, 300);
  }, [ref, position, stillWhen]);
}
