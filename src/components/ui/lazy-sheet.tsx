"use client";

import { useEffect, useState, type ComponentType } from "react";

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
 *   Record stock finds it here; opened sooner, it is fetched at once and drawn
 *   as it arrives.
 * - **Drawn in the tap's own frame once here.** It is held as a component,
 *   not through `React.lazy`: a lazy component suspends on its first render
 *   even when its code has long arrived, and React then holds a suspended
 *   reveal back for about 300 ms — every first open waited that long.
 * - **Mounted the first time it is shown,** then kept, so its closing motion
 *   plays and its state survives a reopen as before.
 * - **A failed fetch** is thrown where it is drawn, for the screen's error
 *   boundary, as a lazy one's was; the next opening asks again.
 *
 * `shown` reads from its props whether it is open: `isOpen`, `open`, or the
 * subject it is open for.
 */
export function lazySheet<P extends object>(load: () => Promise<ComponentType<P>>, shown: (props: P) => boolean) {
  let loading: Promise<ComponentType<P>> | undefined;
  let loaded: ComponentType<P> | undefined;
  const preload = () =>
    (loading ??= load().then(
      (component) => (loaded = component),
      (failure: unknown) => {
        loading = undefined;
        throw failure;
      },
    ));

  function LazySheet(props: P) {
    const open = shown(props);
    const [mounted, setMounted] = useState(open);
    // The first time it opens it is mounted for good (state derived while rendering).
    if (open && !mounted) setMounted(true);
    const [Sheet, setSheet] = useState<ComponentType<P> | undefined>(() => loaded);
    const [failure, setFailure] = useState<unknown>();

    // Asked for once the screen is idle, or at once if it opens first.
    useEffect(() => {
      if (Sheet) return;
      let live = true;
      const take = () =>
        void preload().then(
          (component) => live && setSheet(() => component),
          (reason: unknown) => live && setFailure(() => reason),
        );
      const stop = mounted ? (take(), undefined) : whenIdle(take);
      return () => {
        live = false;
        stop?.();
      };
    }, [Sheet, mounted]);

    if (mounted && failure !== undefined) throw failure;
    if (!mounted || !Sheet) return null;
    return <Sheet {...props} />;
  }

  return Object.assign(LazySheet, { preload });
}
