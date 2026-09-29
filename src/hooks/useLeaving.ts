"use client";

import { useEffect, useState } from "react";

import { EXIT_MS } from "@/lib/motion";

/**
 * Whether something that has just gone is still on its way out: true for
 * EXIT_MS after `present` turns false, so it can play its exit
 * (`animate-pop-out`) before it is taken off the screen, rather than vanish.
 * It counts time rather than waiting for the animation to end, because an
 * animation never plays, nor ends, on something not drawn: a pill hidden at
 * this width would never leave. Coming back cuts the exit short.
 */
export function useLeaving(present: boolean): boolean {
  // Worked out while rendering, as React advises for state that follows a value.
  const [was, setWas] = useState(present);
  const [leaving, setLeaving] = useState(false);
  let current = leaving;
  if (was !== present) {
    setWas(present);
    current = !present;
    setLeaving(current);
  }

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setLeaving(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  return current;
}
