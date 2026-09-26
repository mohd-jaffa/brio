"use client";

import { useState, type ReactNode } from "react";

/**
 * A count or an amount that rolls the way it moved — up as it grows, down as
 * it shrinks — like a till counting (the order flow's motion, globals.css).
 * `value` decides the direction and `children` is what is shown, so a total
 * in paise can read "₹1,250". Nothing moves when it first shows; only a
 * change does. The number is plain text to a screen reader, as before.
 */
export function RollingNumber({ value, children }: { value: number; children?: ReactNode }) {
  const [shown, setShown] = useState({ value, turn: 0, direction: 0 });
  let current = shown;
  if (shown.value !== value) {
    current = { value, turn: shown.turn + 1, direction: value > shown.value ? 1 : -1 };
    setShown(current);
  }
  const roll = current.direction > 0 ? "animate-tick-up" : current.direction < 0 ? "animate-tick-down" : undefined;
  return (
    // Clipped top and bottom, a little beyond the glyphs, so the roll comes
    // from behind an edge rather than across the text above it.
    <span className="-my-[0.15em] inline-flex overflow-y-clip py-[0.15em]">
      <span key={current.turn} className={roll}>
        {children ?? value}
      </span>
    </span>
  );
}
