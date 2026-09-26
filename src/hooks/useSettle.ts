"use client";

import { useEffect, type RefObject } from "react";

import { canAnimate } from "@/lib/motion";

/** What a placeholder is marked with: `Skeleton`, a chart's loading shape. */
export const SKELETON_ATTRIBUTE = "data-skeleton";

const SETTLE_MS = 200;

/** Whether a node that left was a placeholder, or held one. */
const heldSkeleton = (node: Node) =>
  node instanceof Element &&
  (node.hasAttribute(SKELETON_ATTRIBUTE) || node.querySelector(`[${SKELETON_ATTRIBUTE}]`) !== null);

/**
 * Content fades in over the placeholder it replaces, anywhere inside `region`
 * (plan §139.5): whatever lands where a skeleton has just left settles in over
 * 200 ms. Content that was already there — cached, or never waited for —
 * simply shows, since only a change moves. Watching the region once leaves
 * every screen's own loading branch as it is. It only fades, so it reads the
 * same under reduced motion.
 *
 * A change is seen before it is drawn (a MutationObserver answers in the same
 * turn as React's commit), so the content never flashes in first.
 */
export function useSettle(region: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = region.current;
    if (!canAnimate(element) || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver((records) => {
      const emptied = new Set(
        records.filter((record) => [...record.removedNodes].some(heldSkeleton)).map((record) => record.target),
      );
      for (const record of records) {
        if (!emptied.has(record.target)) continue;
        for (const node of record.addedNodes) {
          if (node instanceof Element && !heldSkeleton(node)) {
            node.animate([{ opacity: 0 }, { opacity: 1 }], {
              duration: SETTLE_MS,
              easing: "ease-out",
            });
          }
        }
      }
    });
    observer.observe(element, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [region]);
}
