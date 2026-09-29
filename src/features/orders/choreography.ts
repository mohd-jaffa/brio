import { EASE_OUT_EXPO, canAnimate, prefersReducedMotion } from "@/lib/motion";

const WIDE_ORDER = "(min-width: 1024px)";
const TARGET = "[data-order-add-target]";

export interface OrderAddTicket {
  productId: string;
  origin: DOMRect;
  token: HTMLElement;
}

interface ViewTransitionLike {
  finished: Promise<unknown>;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => ViewTransitionLike;
};

/** Captures the + before React turns it into the order's next count. */
export function captureOrderAdd(origin: HTMLElement, productId: string): OrderAddTicket | null {
  const bounds = origin.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return null;

  const token = origin.cloneNode(true) as HTMLElement;
  token.setAttribute("aria-hidden", "true");
  token.setAttribute("tabindex", "-1");
  token.style.pointerEvents = "none";
  return { productId, origin: bounds, token };
}

const visible = (element: HTMLElement) => {
  const bounds = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  if (
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    bounds.right <= 0 ||
    bounds.bottom <= 0 ||
    bounds.left >= window.innerWidth ||
    bounds.top >= window.innerHeight ||
    style.display === "none" ||
    style.visibility === "hidden"
  ) {
    return false;
  }

  // A sticky footer can cover a line whose rectangle still intersects the
  // viewport. Do not send a token behind it: it should land only where the
  // owner can actually see the line receive it.
  const x = Math.min(window.innerWidth - 1, Math.max(0, bounds.left + bounds.width / 2));
  const y = Math.min(window.innerHeight - 1, Math.max(0, bounds.top + bounds.height / 2));
  const hit = document.elementFromPoint?.(x, y);
  return !hit || element.contains(hit) || hit.contains(element);
};

/** The new desktop line wins; on a phone the visible cart badge receives it. */
function addTarget(productId: string): HTMLElement | null {
  const targets = [...document.querySelectorAll<HTMLElement>(TARGET)].filter(visible);
  return targets.find((target) => target.dataset.orderProductId === productId) ?? targets[0] ?? null;
}

/**
 * Sends one captured + into the place the order just grew. The transient node
 * is decorative, fixed to the viewport and moves only by transform, so it
 * cannot disturb layout or become reachable. Reduced motion keeps only the
 * destination acknowledgement.
 */
export function playOrderAdd(ticket: OrderAddTicket): Animation[] {
  const target = addTarget(ticket.productId);
  if (!canAnimate(target)) return [];

  if (prefersReducedMotion()) {
    return [target.animate([{ opacity: 0.55 }, { opacity: 1 }], { duration: 160, easing: "ease-out" })];
  }

  const destination = target.getBoundingClientRect();
  const dx = destination.left + destination.width / 2 - (ticket.origin.left + ticket.origin.width / 2);
  const dy = destination.top + destination.height / 2 - (ticket.origin.top + ticket.origin.height / 2);
  const lift = Math.min(72, Math.max(28, Math.abs(dy) * 0.12));
  const { token } = ticket;

  Object.assign(token.style, {
    position: "fixed",
    left: `${ticket.origin.left}px`,
    top: `${ticket.origin.top}px`,
    width: `${ticket.origin.width}px`,
    height: `${ticket.origin.height}px`,
    margin: "0",
    zIndex: "70",
    transformOrigin: "center",
    willChange: "transform, opacity",
    boxShadow: "var(--shadow-elevated)",
  });
  document.body.append(token);
  const flight = token.animate(
    [
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)" },
      {
        opacity: 1,
        offset: 0.46,
        transform: `translate3d(${dx * 0.46}px, ${dy * 0.46 - lift}px, 0) scale(0.82) rotate(-7deg)`,
      },
      { opacity: 0.12, transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.38) rotate(4deg)` },
    ],
    { duration: 520, easing: EASE_OUT_EXPO, fill: "forwards" },
  );
  const acknowledgement = target.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.12)", offset: 0.45 }, { transform: "scale(1)" }],
    { duration: 260, delay: 290, easing: EASE_OUT_EXPO },
  );
  void flight.finished.catch(() => undefined).finally(() => token.remove());
  return [flight, acknowledgement];
}

/** The longest a transition holds the screen while its change is being drawn. */
const DRAW_WAIT_MS = 300;

let changeDrawn: (() => void) | null = null;

/**
 * The order screen calls this from a layout effect once a step or a placed
 * order is drawn, so a waiting transition captures it. With nothing waiting
 * it does nothing.
 */
export function orderChangeDrawn() {
  changeDrawn?.();
}

/**
 * Settles when the screen says the change is drawn, or after DRAW_WAIT_MS.
 * It never waits for an animation frame: the browser runs none while it holds
 * the screen for a transition, and Chrome only lets go after four seconds.
 */
function whenDrawn(): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      window.clearTimeout(timer);
      if (changeDrawn === done) changeDrawn = null;
      resolve();
    };
    const timer = window.setTimeout(done, DRAW_WAIT_MS);
    changeDrawn = done;
  });
}

/**
 * Runs a same-document View Transition when it can add continuity. The update
 * always runs: older browsers, desktop's side-by-side editor and reduced
 * motion keep the existing immediate navigation.
 */
function transitionOrder(update: () => void, kind: "step" | "placed", direction?: "forward" | "back") {
  const documentWithTransitions = document as ViewTransitionDocument;
  const start = documentWithTransitions.startViewTransition;
  const still = window.matchMedia?.(WIDE_ORDER).matches === true;
  if (typeof start !== "function" || prefersReducedMotion() || (kind === "step" && still)) {
    update();
    return null;
  }

  const root = document.documentElement;
  root.dataset.orderTransition = kind;
  if (direction) root.dataset.orderDirection = direction;
  let updated = false;
  try {
    const transition = start.call(documentWithTransitions, async () => {
      const drawn = whenDrawn();
      updated = true;
      update();
      await drawn;
    });
    void transition.finished
      .catch(() => undefined)
      .finally(() => {
        delete root.dataset.orderTransition;
        delete root.dataset.orderDirection;
      });
    return transition;
  } catch {
    delete root.dataset.orderTransition;
    delete root.dataset.orderDirection;
    if (!updated) update();
    return null;
  }
}

/**
 * Whether an order view transition is moving the screen now. The step travel
 * (`useTravelMotion`) then keeps still, so a step does not slide in twice; a
 * step changed without one — the browser's Back, or a browser without View
 * Transitions — still travels.
 */
export function orderTransitionRunning(): boolean {
  return document.documentElement.dataset.orderTransition !== undefined;
}

export function transitionOrderStep(update: () => void, forward: boolean) {
  return transitionOrder(update, "step", forward ? "forward" : "back");
}

export function transitionOrderPlaced(update: () => void) {
  return transitionOrder(update, "placed");
}
