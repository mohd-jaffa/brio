import { afterEach, describe, expect, it, vi } from "vitest";

import {
  captureOrderAdd,
  orderChangeDrawn,
  orderTransitionRunning,
  playOrderAdd,
  transitionOrderPlaced,
  transitionOrderStep,
} from "@/features/orders/choreography";
import { EASE_OUT_EXPO } from "@/lib/motion";

const bounds = (left: number, top: number, width = 32, height = 32) =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

const animation = () => ({ finished: Promise.resolve() }) as unknown as Animation;
type Animate = (frames?: Keyframe[] | PropertyIndexedKeyframes, options?: KeyframeAnimationOptions) => Animation;

afterEach(() => {
  document.body.replaceChildren();
  Reflect.deleteProperty(document, "startViewTransition");
  Reflect.deleteProperty(HTMLElement.prototype, "animate");
  delete document.documentElement.dataset.orderTransition;
  delete document.documentElement.dataset.orderDirection;
  Reflect.deleteProperty(window, "matchMedia");
  vi.restoreAllMocks();
});

describe("order add choreography", () => {
  it("captures the pressed + and lands it in the matching desktop line", () => {
    window.matchMedia = vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia;
    const animate = vi.fn<Animate>(() => animation());
    Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });

    const origin = document.createElement("button");
    origin.innerHTML = "<span>+</span>";
    origin.getBoundingClientRect = () => bounds(20, 300);
    const cart = document.createElement("span");
    cart.dataset.orderAddTarget = "cart";
    cart.getBoundingClientRect = () => bounds(20, 700, 44, 44);
    const line = document.createElement("span");
    line.dataset.orderAddTarget = "line";
    line.dataset.orderProductId = "cake";
    line.getBoundingClientRect = () => bounds(900, 220, 48, 48);
    document.body.append(cart, line);

    const ticket = captureOrderAdd(origin, "cake");
    expect(ticket?.token).not.toBe(origin);
    const played = playOrderAdd(ticket!);

    expect(played).toHaveLength(2);
    expect(animate).toHaveBeenCalledTimes(2);
    const flightFrames = animate.mock.calls[0]![0] as Keyframe[];
    expect(String(flightFrames.at(-1)?.transform)).toContain("translate3d(888px, -72px, 0)");
    expect(animate.mock.calls[0]![1]).toEqual({ duration: 520, easing: EASE_OUT_EXPO, fill: "forwards" });
    expect(animate.mock.calls[1]![1]).toMatchObject({ delay: 290, duration: 260 });
    expect(document.body.contains(ticket?.token ?? null)).toBe(true);
  });

  it("takes its token away even when the flight is cancelled", async () => {
    window.matchMedia = vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia;
    const cancelled = Promise.reject(new Error("AbortError"));
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      value: vi.fn(() => ({ finished: cancelled })),
    });
    const origin = document.createElement("button");
    origin.getBoundingClientRect = () => bounds(20, 300);
    const cart = document.createElement("span");
    cart.dataset.orderAddTarget = "cart";
    cart.getBoundingClientRect = () => bounds(20, 700, 44, 44);
    document.body.append(cart);

    const ticket = captureOrderAdd(origin, "cake")!;
    playOrderAdd(ticket);
    expect(document.body.contains(ticket.token)).toBe(true);
    await cancelled.catch(() => undefined);
    await Promise.resolve();
    expect(document.body.contains(ticket.token)).toBe(false);
  });

  it("acknowledges the visible target without travel under reduced motion", () => {
    window.matchMedia = vi.fn((query: string) => ({
      matches: query.includes("reduce"),
    })) as unknown as typeof window.matchMedia;
    const animate = vi.fn<Animate>(() => animation());
    Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
    const origin = document.createElement("button");
    origin.getBoundingClientRect = () => bounds(20, 300);
    const cart = document.createElement("span");
    cart.dataset.orderAddTarget = "cart";
    cart.getBoundingClientRect = () => bounds(20, 700, 44, 44);
    document.body.append(cart);

    const ticket = captureOrderAdd(origin, "cake")!;
    expect(playOrderAdd(ticket)).toHaveLength(1);
    expect(animate).toHaveBeenCalledWith([{ opacity: 0.55 }, { opacity: 1 }], {
      duration: 160,
      easing: "ease-out",
    });
    expect(document.body.contains(ticket.token)).toBe(false);
  });

  it("does nothing before an origin or destination has layout", () => {
    const origin = document.createElement("button");
    origin.getBoundingClientRect = () => bounds(0, 0, 0, 0);
    expect(captureOrderAdd(origin, "cake")).toBeNull();

    // A + with layout, but nowhere visible to land: the cart is hidden.
    Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: vi.fn() });
    origin.getBoundingClientRect = () => bounds(20, 300);
    const cart = document.createElement("span");
    cart.dataset.orderAddTarget = "cart";
    cart.style.display = "none";
    cart.getBoundingClientRect = () => bounds(20, 700, 44, 44);
    document.body.append(cart);
    const ticket = captureOrderAdd(origin, "cake")!;
    expect(playOrderAdd(ticket)).toEqual([]);
    expect(document.body.contains(ticket.token)).toBe(false);
  });
});

describe("order view transitions", () => {
  it("carries a phone step forward and clears its direction when finished", async () => {
    window.matchMedia = vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia;
    let finish: () => void = () => {};
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const start = vi.fn((update: () => void | Promise<void>) => {
      void update();
      return { finished };
    });
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: start });
    const update = vi.fn();

    expect(transitionOrderStep(update, true)).not.toBeNull();
    expect(update).toHaveBeenCalledOnce();
    expect(document.documentElement.dataset.orderTransition).toBe("step");
    expect(document.documentElement.dataset.orderDirection).toBe("forward");
    expect(orderTransitionRunning()).toBe(true);
    finish();
    await finished;
    await Promise.resolve();
    expect(document.documentElement).not.toHaveAttribute("data-order-transition");
    expect(orderTransitionRunning()).toBe(false);
  });

  it("keeps steps immediate on wide screens but still carries the placed order", () => {
    window.matchMedia = vi.fn((query: string) => ({
      matches: query.includes("min-width"),
    })) as unknown as typeof window.matchMedia;
    const start = vi.fn((update: () => void | Promise<void>) => {
      void update();
      return { finished: new Promise(() => undefined) };
    });
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: start });
    const step = vi.fn();
    const placed = vi.fn();

    expect(transitionOrderStep(step, false)).toBeNull();
    expect(step).toHaveBeenCalledOnce();
    expect(start).not.toHaveBeenCalled();
    expect(transitionOrderPlaced(placed)).not.toBeNull();
    expect(placed).toHaveBeenCalledOnce();
  });

  it("uses the immediate fallback for reduced motion", () => {
    window.matchMedia = vi.fn((query: string) => ({
      matches: query.includes("reduce"),
    })) as unknown as typeof window.matchMedia;
    const start = vi.fn();
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: start });
    const update = vi.fn();

    expect(transitionOrderPlaced(update)).toBeNull();
    expect(update).toHaveBeenCalledOnce();
    expect(start).not.toHaveBeenCalled();
  });

  it("clears its marks when the browser skips a transition it had started", async () => {
    window.matchMedia = vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia;
    const finished = Promise.reject(new Error("AbortError"));
    const start = vi.fn((update: () => void | Promise<void>) => {
      void update();
      return { finished };
    });
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: start });

    transitionOrderStep(vi.fn(), false);
    expect(orderTransitionRunning()).toBe(true);
    await finished.catch(() => undefined);
    await Promise.resolve();
    expect(orderTransitionRunning()).toBe(false);
  });

  it("still makes the change when the browser refuses the transition, and only once", () => {
    window.matchMedia = vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia;
    const refuse = vi.fn(() => {
      throw new Error("InvalidStateError");
    });
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: refuse });
    const before = vi.fn();
    expect(transitionOrderStep(before, false)).toBeNull();
    expect(before).toHaveBeenCalledOnce();
    expect(orderTransitionRunning()).toBe(false);

    const late = vi.fn((update: () => void | Promise<void>) => {
      void update();
      throw new Error("AbortError");
    });
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: late });
    const after = vi.fn();
    expect(transitionOrderPlaced(after)).toBeNull();
    expect(after).toHaveBeenCalledOnce();
    expect(orderTransitionRunning()).toBe(false);
  });

  it("captures the change once the screen has drawn it, never waiting for a frame", async () => {
    window.matchMedia = vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia;
    const frame = vi.spyOn(window, "requestAnimationFrame");
    let settled = false;
    const start = vi.fn((update: () => Promise<void>) => {
      void update().then(() => (settled = true));
      return { finished: new Promise(() => undefined) };
    });
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: start });
    const update = vi.fn();

    transitionOrderStep(update, true);
    expect(update).toHaveBeenCalledOnce();
    await Promise.resolve();
    expect(settled).toBe(false);

    orderChangeDrawn();
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(true);
    expect(frame).not.toHaveBeenCalled();
  });

  it("lets go of the screen when no change is drawn", async () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia;
    let settled = false;
    const start = vi.fn((update: () => Promise<void>) => {
      void update().then(() => (settled = true));
      return { finished: new Promise(() => undefined) };
    });
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: start });

    // With nothing waiting, the screen's signal does nothing.
    expect(() => orderChangeDrawn()).not.toThrow();
    transitionOrderPlaced(vi.fn());
    await vi.advanceTimersByTimeAsync(299);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);

    // A newer transition takes the signal; the older one still lets go on time.
    const settles: string[] = [];
    start.mockImplementation((update: () => Promise<void>) => {
      const which = settles.length === 0 && start.mock.calls.length === 2 ? "older" : "newer";
      void update().then(() => settles.push(which));
      return { finished: new Promise(() => undefined) };
    });
    transitionOrderStep(vi.fn(), true);
    await vi.advanceTimersByTimeAsync(100);
    transitionOrderStep(vi.fn(), false);
    await vi.advanceTimersByTimeAsync(200);
    expect(settles).toEqual(["older"]);
    orderChangeDrawn();
    await vi.advanceTimersByTimeAsync(0);
    expect(settles).toEqual(["older", "newer"]);
    vi.useRealTimers();
  });
});
