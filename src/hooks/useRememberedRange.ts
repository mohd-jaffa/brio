"use client";

import { useState } from "react";

import { DATE_RANGES, DEFAULT_DATE_RANGE, type DateRange } from "@/constants/ranges";

const KEY = (screen: string) => `ovenly_range_${screen}`;

function read(screen: string): DateRange {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY(screen)) ?? "null") as Partial<DateRange> | null;
    if (stored && (DATE_RANGES as readonly string[]).includes(stored.preset ?? "")) return stored as DateRange;
  } catch {
    // Storage may be closed to this page (a private window) or hold something unreadable: start fresh.
  }
  return { preset: DEFAULT_DATE_RANGE };
}

/**
 * The period a report screen reads over, remembered on this device for that
 * screen (plan §139.11.11): Expenses and Analytics each come back to the range
 * last chosen there. Storage that cannot be read or written only means the
 * choice is not kept.
 */
export function useRememberedRange(screen: string): [DateRange, (next: DateRange) => void] {
  const [range, setRange] = useState<DateRange>(() => read(screen));
  const choose = (next: DateRange) => {
    setRange(next);
    try {
      localStorage.setItem(KEY(screen), JSON.stringify(next));
    } catch {
      // Not kept; the screen still shows what was chosen.
    }
  };
  return [range, choose];
}
