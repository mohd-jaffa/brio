"use client";

import { useState } from "react";

/**
 * What a closing sheet shows: the value while the sheet is open, and the last
 * one it had open while it closes. A sheet that opens for a record and closes
 * by letting go of it leaves showing that record — not an empty body under a
 * changed title while it slides away.
 */
export function useKept<T>(value: T, open: boolean): T {
  // Worked out while rendering, as React advises for state that follows a prop.
  const [kept, setKept] = useState(value);
  if (open && value !== kept) setKept(value);
  return open ? value : kept;
}
