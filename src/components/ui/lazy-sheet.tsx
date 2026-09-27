"use client";

import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";

/** Runs `task` once the browser has nothing better to do, or a little later where it cannot say. */
function whenIdle(task: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(task, { timeout: 4_000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, 1_500);
  return () => window.clearTimeout(id);
}

/**
 * A sheet or form kept out of its screen's first download (plan §139.9,
 * 2026-09-27): a screen arrives with only what it shows, and a form it may
 * never open — with its validation and its own components — comes after.
 *
 * - **Fetched once the screen is idle,** so the first tap on New customer or
 *   Record stock rarely waits for it; opened sooner, it arrives as it opens.
 * - **Mounted the first time it is shown,** then kept, so its closing motion
 *   plays and its state survives a reopen as before.
 *
 * `shown` reads from its props whether it is open: `isOpen`, `open`, or the
 * subject it is open for.
 */
export function lazySheet<P extends object>(load: () => Promise<ComponentType<P>>, shown: (props: P) => boolean) {
  let loading: Promise<ComponentType<P>> | undefined;
  const preload = () => (loading ??= load());
  const Sheet = lazy(async () => ({ default: await preload() }));

  function LazySheet(props: P) {
    const open = shown(props);
    const [mounted, setMounted] = useState(open);
    // The first time it opens it is mounted for good (state derived while rendering).
    if (open && !mounted) setMounted(true);

    useEffect(() => whenIdle(() => void preload()), []);

    if (!mounted) return null;
    return (
      <Suspense fallback={null}>
        <Sheet {...props} />
      </Suspense>
    );
  }

  return Object.assign(LazySheet, { preload });
}
