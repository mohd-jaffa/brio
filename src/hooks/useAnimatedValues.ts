"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { prefersReducedMotion } from "@/lib/motion";

const DURATION_MS = 520;

export interface AnimatedValue {
  /** Stable within this chart. A line or bar can use its slot; a ring uses its slice. */
  key: string;
  value: number;
}

const easeOutExpo = (progress: number) => (progress === 1 ? 1 : 1 - 2 ** (-10 * progress));

/**
 * Lets a chart keep the geometry it was already showing while its next set of
 * numbers arrives, then moves every matched value to its new place together.
 * It reads no layout and updates only the small SVG driven by the caller.
 *
 * A first set is simply present: the chart's authored entrance owns that
 * moment. Later sets interpolate over the app's settle time. A new key grows
 * from zero; a key that remains starts wherever an interrupted transition had
 * reached. Reduced-motion and browsers without animation frames change at
 * once.
 */
export function useAnimatedValues(targets: readonly AnimatedValue[]): number[] {
  const signature = JSON.stringify(targets);
  const target = useMemo<AnimatedValue[]>(() => JSON.parse(signature) as AnimatedValue[], [signature]);
  const positions = useRef(new Map(targets.map((item) => [item.key, item.value])));
  const [shown, setShown] = useState(() => new Map(targets.map((item) => [item.key, item.value])));
  const frame = useRef<number | null>(null);

  const canMove =
    typeof window !== "undefined" && typeof window.requestAnimationFrame === "function" && !prefersReducedMotion();

  useLayoutEffect(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);

    const next = target;
    if (!canMove) {
      positions.current = new Map(next.map((item) => [item.key, item.value]));
      frame.current = null;
      return;
    }

    const from = next.map((item) => positions.current.get(item.key) ?? 0);
    if (next.every((item, index) => item.value === from[index])) {
      positions.current = new Map(next.map((item) => [item.key, item.value]));
      frame.current = null;
      return;
    }

    let started: number | undefined;
    const move = (now: number) => {
      started ??= now;
      const progress = Math.min((now - started) / DURATION_MS, 1);
      const eased = easeOutExpo(progress);
      const positionsAtFrame = new Map(
        next.map((item, index) => [item.key, from[index] + (item.value - from[index]) * eased]),
      );
      positions.current = positionsAtFrame;
      setShown(positionsAtFrame);
      frame.current = progress < 1 ? requestAnimationFrame(move) : null;
    };

    frame.current = requestAnimationFrame(move);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [canMove, target]);

  if (!canMove) return targets.map((item) => item.value);
  return targets.map((item) => shown.get(item.key) ?? 0);
}
