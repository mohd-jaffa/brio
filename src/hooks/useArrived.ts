"use client";

import { useState } from "react";

/**
 * Whether something now on screen arrived while the screen was open, rather
 * than being there when it opened: the cart bar after the first item, a badge
 * after the first add, the address fields after Delivery is chosen. A screen
 * animates what changes, never what merely loaded. While `known` is false —
 * the data it depends on is still loading — its absence proves nothing.
 */
export function useArrived(present: boolean, known = true): boolean {
  // Worked out while rendering, as React advises for state that follows a
  // value; an effect would answer a render too late.
  const [wasAbsent, setWasAbsent] = useState(known && !present);
  if (known && !present && !wasAbsent) {
    setWasAbsent(true);
    return false;
  }
  return present && wasAbsent;
}
