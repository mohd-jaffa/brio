"use client";

import { useEffect } from "react";

/** One after another, when several come into view together. */
const TICK_STAGGER_MS = 90;

/**
 * Draws each point's check once, as it comes into view (the critique,
 * 2026-10-01: tied to the scroll, a check could stop half drawn). Every
 * `[data-tick]` on the page waits undrawn (`wait`) until it is well inside the
 * screen, then is drawn (`done`) and left alone, scrolling back included.
 * Without this, or under reduced motion, the checks are simply there
 * (globals.css, `.landing-tick`).
 */
export function Ticks() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const points = [...document.querySelectorAll<HTMLElement>("[data-tick]")];
    const observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach(({ target }, at) => {
            const point = target as HTMLElement;
            point.style.setProperty("--tick-delay", `${at * TICK_STAGGER_MS}ms`);
            point.dataset.tick = "done";
            observer.unobserve(point);
          });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.6 },
    );
    for (const point of points) {
      point.dataset.tick = "wait";
      observer.observe(point);
    }
    return () => observer.disconnect();
  }, []);

  return null;
}
