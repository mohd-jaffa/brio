/**
 * The motion the kit plays from script — a list closing a gap, a tab's view
 * coming in from its side — on the same curve and times as the CSS in
 * `globals.css`. Only a change moves; nothing plays because a screen loaded.
 * Someone who asks for less motion gets no travel, only short fades, so an
 * arrival is still there to see.
 */

/** The app's one arrival curve: quick to move, slow to settle (`--ease-out-expo`). */
export const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";

/** How long a card takes to leave; `globals.css` plays its exit in the same time. */
export const EXIT_MS = 200;

/** Whether the person has asked their device for less motion. */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Whether this browser can play an animation from script; one that cannot shows every change at once. */
export function canAnimate(element: Element | null): element is Element {
  return element !== null && typeof element.animate === "function";
}

/**
 * Brings a region in from the side it is travelling towards — forward from
 * the right, back from the left — so the way back is where it looks to be.
 * Under reduced motion it only fades.
 */
export function travelIn(region: Element, forward: boolean, distance: number, duration: number) {
  const reduce = prefersReducedMotion();
  region.animate(
    reduce
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [
          {
            opacity: 0,
            transform: `translateX(${forward ? distance : -distance}px)`,
          },
          { opacity: 1, transform: "none" },
        ],
    { duration: reduce ? 160 : duration, easing: EASE_OUT_EXPO },
  );
}
