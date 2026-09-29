"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

import { EASE_OUT_EXPO, canAnimate, prefersReducedMotion } from "@/lib/motion";

/** Names the motion this hook starts, so it stops only its own and never an item's own arrival. */
const MOTION = "list-motion";
/** More comings and goings than this at once is a new list — a search, a page, a filter — not a change to one. */
const MOST_CHANGES = 6;
const MOVE_MS = 260;
const ARRIVE_MS = 240;
const FADE_MS = 160;
const STAGGER_MS = 30;
const MOST_STAGGERED = 4;
const OPEN_MS = 260;

interface Layout {
  /** Where the layout puts each item, from the list's own corner — a scroll is not a move. */
  places: Map<Element, { x: number; y: number }>;
  height: number;
}

function measure(list: HTMLElement): Layout {
  const items = [...list.children] as HTMLElement[];
  return {
    places: new Map(items.map((item) => [item, { x: item.offsetLeft, y: item.offsetTop }])),
    height: list.offsetHeight,
  };
}

const ours = (element: Element) => element.getAnimations().filter((animation) => animation.id === MOTION);

/**
 * An item opening from nothing to the room it takes: its height, padding and
 * borders grow together, so what holds the list grows with it, and what it
 * holds is clipped to it on the way (`clip-path`, which, unlike `overflow`,
 * animates, and is gone once it has opened).
 */
function opening(item: HTMLElement): Keyframe[] {
  const style = getComputedStyle(item);
  const clip = "inset(0)";
  return [
    {
      height: "0px",
      paddingTop: "0px",
      paddingBottom: "0px",
      borderTopWidth: "0px",
      borderBottomWidth: "0px",
      opacity: 0,
      clipPath: clip,
    },
    {
      height: `${item.offsetHeight}px`,
      paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom,
      borderTopWidth: style.borderTopWidth,
      borderBottomWidth: style.borderBottomWidth,
      opacity: 1,
      clipPath: clip,
    },
  ];
}

export interface ListMotionOptions {
  /**
   * How a new item comes in. `drop`, the default, drops it into its place
   * while the others travel to theirs. `open` is for a list whose holder sizes
   * to it — a sheet: the item opens from nothing, so the sheet grows smoothly
   * rather than jumping, and the items after it are carried along by it.
   */
  arrival?: "drop" | "open";
}

/**
 * A list whose items keep their places as it changes (plan §139.5): when one
 * leaves, those after it close the gap rather than jump, and the list's edge
 * follows them up; when the order changes, each travels to its new place; one
 * that joins drops in. The list is measured after every change, from its own
 * corner, so it must be positioned (`relative`) for its items to measure
 * from it.
 *
 * Only a change moves: the list's first showing plays nothing, nor does a
 * list that is not drawn — hidden behind a breakpoint, or a step away. More
 * than a few items coming and going at once only fades the new ones in. An
 * item that brings its own arrival (`Row arriving`) keeps it. Under reduced
 * motion nothing travels; new items fade.
 */
export function useListMotion<T extends HTMLElement>({
  arrival = "drop",
}: ListMotionOptions = {}): RefObject<T | null> {
  const list = useRef<T>(null);
  const last = useRef<Layout | null>(null);

  useLayoutEffect(() => {
    const element = list.current;
    if (!canAnimate(element)) return;
    const previous = last.current;
    // A list that is not drawn is forgotten, so it does not travel from nowhere when it next is.
    if (element.getClientRects().length === 0) {
      last.current = null;
      return;
    }
    if (!previous) {
      last.current = measure(element);
      return;
    }

    const items = [...element.children];
    const added = items.filter((item) => !previous.places.has(item));
    const gone = previous.places.size - (items.length - added.length);
    const places = measure(element).places;
    const moved = items.filter((item) => {
      const before = previous.places.get(item);
      const after = places.get(item)!;
      return before !== undefined && (Math.abs(before.x - after.x) >= 1 || Math.abs(before.y - after.y) >= 1);
    });
    // Nothing came, went or moved: whatever is playing plays on.
    if (added.length === 0 && gone === 0 && moved.length === 0) return;

    // The list's own height is read without its running change, so the new one is where the layout puts it.
    ours(element).forEach((animation) => animation.cancel());
    last.current = measure(element);
    const reduce = prefersReducedMotion();
    const fade = [{ opacity: 0 }, { opacity: 1 }];

    if (added.length + gone > MOST_CHANGES) {
      added.forEach((item) => item.animate(fade, { duration: FADE_MS, easing: "ease-out", id: MOTION }));
      return;
    }

    // Only arrivals: each opens its own room, and the items after it are
    // carried along by the layout as it grows, so none of them is moved.
    if (arrival === "open" && gone === 0 && added.length > 0) {
      for (const item of added) {
        if (item.getAnimations().length > 0) continue;
        item.animate(reduce ? fade : opening(item as HTMLElement), {
          duration: reduce ? FADE_MS : OPEN_MS,
          easing: EASE_OUT_EXPO,
          id: MOTION,
        });
      }
      return;
    }

    if (!reduce) {
      for (const item of moved) {
        const before = previous.places.get(item)!;
        const after = places.get(item)!;
        // Where it is drawn right now, over and above its old place: an
        // interrupted move carries on from there rather than jumping.
        const running = ours(item);
        const matrix = new DOMMatrixReadOnly(running.length > 0 ? getComputedStyle(item).transform : "none");
        running.forEach((animation) => animation.cancel());
        const dx = before.x + matrix.m41 - after.x;
        const dy = before.y + matrix.m42 - after.y;
        item.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
          duration: MOVE_MS,
          easing: EASE_OUT_EXPO,
          id: MOTION,
        });
      }
      // A list that shrank draws its edge up with its items, rather than cutting the last one off.
      if (last.current.height < previous.height) {
        element.animate([{ height: `${previous.height}px` }, { height: `${last.current.height}px` }], {
          duration: MOVE_MS,
          easing: EASE_OUT_EXPO,
          id: MOTION,
        });
      }
    }

    let arriving = 0;
    for (const item of added) {
      if (item.getAnimations().length > 0) continue;
      item.animate(
        reduce
          ? fade
          : [
              { opacity: 0, transform: "translateY(-6px)" },
              { opacity: 1, transform: "none" },
            ],
        {
          duration: reduce ? FADE_MS : ARRIVE_MS,
          delay: reduce ? 0 : Math.min(arriving++, MOST_STAGGERED) * STAGGER_MS,
          easing: EASE_OUT_EXPO,
          fill: "backwards",
          id: MOTION,
        },
      );
    }
  });

  // Text that wraps anew — a turned phone, a font that loaded — moves items
  // with no change to the list; they are measured again, so the next change
  // does not play that move too.
  useEffect(() => {
    const element = list.current;
    if (!canAnimate(element) || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (last.current) last.current = measure(element);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return list;
}
