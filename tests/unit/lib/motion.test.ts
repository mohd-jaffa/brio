import { afterEach, describe, expect, it, vi } from "vitest";

import { EASE_OUT_EXPO, canAnimate, prefersReducedMotion, travelIn } from "@/lib/motion";

function reduceMotion(reduce: boolean) {
  window.matchMedia = vi.fn(() => ({ matches: reduce })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
});

describe("prefersReducedMotion", () => {
  it("follows the device, and is false where the browser cannot say", () => {
    expect(prefersReducedMotion()).toBe(false);
    reduceMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
    reduceMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe("canAnimate", () => {
  it("needs an element that can play an animation", () => {
    expect(canAnimate(null)).toBe(false);
    const element = document.createElement("div");
    expect(canAnimate(element)).toBe(false);
    element.animate = vi.fn();
    expect(canAnimate(element)).toBe(true);
  });
});

describe("travelIn", () => {
  it("comes in from the side it travels towards, on the arrival curve", () => {
    const element = document.createElement("div");
    const animate = vi.fn();
    element.animate = animate;
    travelIn(element, true, 8, 220);
    expect(animate).toHaveBeenCalledWith(
      [
        { opacity: 0, transform: "translateX(8px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 220, easing: EASE_OUT_EXPO },
    );
    travelIn(element, false, 24, 300);
    expect(animate.mock.calls[1][0][0]).toEqual({ opacity: 0, transform: "translateX(-24px)" });
  });

  it("only fades under reduced motion", () => {
    reduceMotion(true);
    const element = document.createElement("div");
    const animate = vi.fn();
    element.animate = animate;
    travelIn(element, true, 8, 220);
    expect(animate).toHaveBeenCalledWith([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: EASE_OUT_EXPO });
  });
});
