"use client";

import { useState } from "react";

import { useArrowSelection } from "./useArrowSelection";

/**
 * The keyboard for a sheet of choices where choosing one commits it and
 * closes the sheet — a customer, a picture (audit A3; the WAI-ARIA radio
 * group). Only the choice in hand is a Tab stop, so a sheet opening on the
 * group starts there; the arrow keys, Home and End move that choice, focus
 * with it, without committing it, so the sheet stays open to look through.
 * Enter, Space or a tap on a choice commits it, as its own click does. Each
 * opening starts again from the choice in use.
 */
export function useSheetChoice<T extends string>(values: readonly T[], inUse: T | null, open: boolean) {
  const [held, setHeld] = useState<T | null>(inUse);
  // Set again as the sheet opens, while rendering (React's way for a prop that changes).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setHeld(inUse);
  }

  const shown = held !== null && values.includes(held) ? held : null;
  const keys = useArrowSelection(values, shown ?? values[0], setHeld);

  return {
    onKeyDown: keys.onKeyDown,
    register: keys.register,
    tabIndex: keys.tabIndex,
    /** Whether a choice is the one in hand: the one in use as the sheet opens, then wherever the arrows take it. */
    checked: (value: T) => value === shown,
  };
}
