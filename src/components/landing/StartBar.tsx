"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Create account, always to hand on a phone (the critique, 2026-10-01: some
 * 8,000 px lay between the hero's button and the closing band's, with nothing
 * to act on). A slim bar along the bottom, of the app's own bottom bar's
 * material, comes up once the element `after` names (the hero's buttons) has
 * gone above the screen, and goes again once the one `until` names (the
 * closing band's button) comes into view, so it never stands beside another
 * Create account. Where the day holds its phone (`held`) it is not drawn.
 * Hidden, it is inert: out of the tab order, and not read out.
 */
export function StartBar({ after, until, children }: { after: string; until: string; children: ReactNode }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const start = document.getElementById(after);
    const end = document.getElementById(until);
    if (!start || !end) return;
    // Measured from where both stand, once a frame as the page scrolls, so a
    // jump or a fling past either is never missed.
    let frame = 0;
    const measure = () => {
      frame = 0;
      setShown(start.getBoundingClientRect().bottom < 0 && end.getBoundingClientRect().top > window.innerHeight);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [after, until]);

  return (
    <div
      data-shown={shown || undefined}
      inert={!shown}
      className="landing-start-bar safe-x [--safe-px:1.25rem] safe-bottom [--safe-pb:0.625rem] fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 pt-2.5 backdrop-blur-md held:hidden"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">{children}</div>
    </div>
  );
}
