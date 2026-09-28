"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { DATE_RANGES, DEFAULT_DATE_RANGE, type DateRange } from "@/constants/ranges";

const KEY = (screen: string) => `brio_range_${screen}`;
const CHANGED = "brio:rangechange";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** What is kept for a screen, as stored: a string compares equal from one read to the next. */
function stored(screen: string): string | null {
  try {
    return localStorage.getItem(KEY(screen));
  } catch {
    // Storage may be closed to this page (a private window): start fresh.
    return null;
  }
}

function toRange(kept: string | null): DateRange {
  try {
    const range = JSON.parse(kept ?? "null") as Partial<DateRange> | null;
    if (range && (DATE_RANGES as readonly string[]).includes(range.preset ?? "")) return range as DateRange;
  } catch {
    // Something unreadable: start fresh.
  }
  return { preset: DEFAULT_DATE_RANGE };
}

/**
 * The period a report screen reads over, remembered on this device for that
 * screen (plan §139.11.11): Expenses and Analytics each come back to the range
 * last chosen there.
 *
 * Read through useSyncExternalStore, as the theme is: the server cannot see
 * this device's storage, so the server and the first render in the browser
 * both draw the default, and React moves to the kept period right after
 * hydration — no mismatch. Storage that cannot be read or written only means
 * the choice is not kept; the screen still shows it.
 */
export function useRememberedRange(screen: string): [DateRange, (next: DateRange) => void] {
  const kept = useSyncExternalStore(
    subscribe,
    () => stored(screen),
    () => null,
  );
  const remembered = useMemo(() => toRange(kept), [kept]);
  // A choice storage would not take, shown all the same.
  const [unkept, setUnkept] = useState<DateRange | null>(null);

  const choose = (next: DateRange) => {
    try {
      localStorage.setItem(KEY(screen), JSON.stringify(next));
      setUnkept(null);
      window.dispatchEvent(new Event(CHANGED));
    } catch {
      setUnkept(next);
    }
  };
  return [unkept ?? remembered, choose];
}
