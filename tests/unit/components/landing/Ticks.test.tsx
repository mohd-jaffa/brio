import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Ticks } from "@/components/landing/Ticks";

/** The observer the page made, and what it was told to watch. */
let observed: Element[] = [];
let unobserved: Element[] = [];
let report: IntersectionObserverCallback = () => undefined;
const disconnect = vi.fn();

beforeEach(() => {
  observed = [];
  unobserved = [];
  vi.stubGlobal(
    "IntersectionObserver",
    vi.fn(function Observer(callback: IntersectionObserverCallback) {
      report = callback;
      return {
        observe: (target: Element) => observed.push(target),
        unobserve: (target: Element) => unobserved.push(target),
        disconnect,
      };
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

/** Three points, and the ticks that draw them. */
function show() {
  return render(
    <ul>
      <li data-tick="">One</li>
      <li data-tick="">Two</li>
      <li data-tick="">Three</li>
      <Ticks />
    </ul>,
  );
}

const points = () => [...document.querySelectorAll<HTMLElement>("[data-tick]")];
const seen = (targets: Element[], isIntersecting = true) =>
  report(
    targets.map((target) => ({ target, isIntersecting }) as IntersectionObserverEntry),
    {} as IntersectionObserver,
  );

describe("Ticks", () => {
  it("has every point wait, undrawn, for the screen", () => {
    show();
    expect(points().map((point) => point.dataset.tick)).toEqual(["wait", "wait", "wait"]);
    expect(observed).toEqual(points());
    expect(IntersectionObserver).toHaveBeenCalledWith(expect.any(Function), {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.6,
    });
  });

  it("draws each once as it comes in, one after another when they come together, and forgets it", () => {
    show();
    const [one, two, three] = points();
    seen([one, two]);
    expect(one.dataset.tick).toBe("done");
    expect(two.dataset.tick).toBe("done");
    expect(one.style.getPropertyValue("--tick-delay")).toBe("0ms");
    expect(two.style.getPropertyValue("--tick-delay")).toBe("90ms");
    expect(unobserved).toEqual([one, two]);

    // Still below the screen: it waits.
    seen([three], false);
    expect(three.dataset.tick).toBe("wait");
  });

  it("stops watching when it goes", () => {
    const { unmount } = show();
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("leaves every check drawn where nothing can watch", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    show();
    expect(points().map((point) => point.dataset.tick)).toEqual(["", "", ""]);
  });
});
