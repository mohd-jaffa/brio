"use client";

import { useState } from "react";

/**
 * A number that changes each time something opens, and holds while it closes.
 * A sheet keys its form with it, so every opening starts a fresh form, filled
 * from the record the moment it shows. A sheet that reset its form in an
 * effect as it opened wiped whatever was typed before that effect landed —
 * on a phone, often a name already typed.
 */
export function useOpeningKey(open: boolean): number {
  // Worked out while rendering, from the last render's `open`, as React
  // advises for state that follows a prop — an effect would come too late.
  const [seen, setSeen] = useState({ open, key: 0 });
  if (seen.open !== open) {
    const next = { open, key: open ? seen.key + 1 : seen.key };
    setSeen(next);
    return next.key;
  }
  return seen.key;
}
