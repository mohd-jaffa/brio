"use client";

import { useCallback, useState } from "react";

export interface ElementSize {
  width: number;
  height: number;
}

const EMPTY: ElementSize = { width: 0, height: 0 };

/**
 * The size of the element `ref` is given to, kept current as it changes. The
 * charts draw at this size rather than scaling a `viewBox`, so their labels
 * stay at the text sizes they were set in (plan §139.11.11). It reads 0 × 0
 * until the element is on screen, including on the server.
 */
export function useElementSize<T extends Element>() {
  const [size, setSize] = useState<ElementSize>(EMPTY);

  const ref = useCallback((node: T | null) => {
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      setSize((previous) => (previous.width === width && previous.height === height ? previous : { width, height }));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}
