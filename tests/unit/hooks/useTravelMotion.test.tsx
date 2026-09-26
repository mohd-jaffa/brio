import { render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTravelMotion } from "@/hooks/useTravelMotion";

function Region({ position, stillWhen, attach = true }: { position: number; stillWhen?: string; attach?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useTravelMotion(ref, position, stillWhen);
  return attach ? <div ref={ref} data-testid="region" /> : null;
}

const animate = vi.fn();

function reduceMotion(reduce: boolean | undefined, wide = false) {
  if (reduce === undefined) Reflect.deleteProperty(window, "matchMedia");
  else
    window.matchMedia = vi.fn((query: string) => ({
      matches: query.includes("reduce") ? reduce : wide,
    })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  animate.mockReset();
  Reflect.deleteProperty(HTMLElement.prototype, "animate");
  Reflect.deleteProperty(window, "matchMedia");
});

describe("useTravelMotion", () => {
  it("moves nothing on the first render", () => {
    HTMLElement.prototype.animate = animate;
    render(<Region position={1} />);
    expect(animate).not.toHaveBeenCalled();
  });

  it("comes in from the right going forward, from the left going back", () => {
    HTMLElement.prototype.animate = animate;
    reduceMotion(false);
    const { rerender } = render(<Region position={0} />);
    rerender(<Region position={1} />);
    expect(animate.mock.calls[0][0][0]).toEqual({ opacity: 0, transform: "translateX(24px)" });
    expect(animate.mock.calls[0][1]).toMatchObject({ duration: 300 });
    rerender(<Region position={0} />);
    expect(animate.mock.calls[1][0][0]).toEqual({ opacity: 0, transform: "translateX(-24px)" });
  });

  it("only fades under reduced motion, and moves where matchMedia is missing", () => {
    HTMLElement.prototype.animate = animate;
    reduceMotion(true);
    const { rerender } = render(<Region position={0} />);
    rerender(<Region position={2} />);
    expect(animate.mock.calls[0][0]).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    expect(animate.mock.calls[0][1]).toMatchObject({ duration: 160 });

    reduceMotion(undefined);
    rerender(<Region position={1} />);
    expect(animate.mock.calls[1][0][0]).toMatchObject({ transform: "translateX(-24px)" });
  });

  it("keeps still on a wide screen, with nothing to move, or where the browser cannot animate", () => {
    HTMLElement.prototype.animate = animate;
    reduceMotion(false, true);
    const wide = render(<Region position={0} stillWhen="(min-width: 1024px)" />);
    wide.rerender(<Region position={1} stillWhen="(min-width: 1024px)" />);
    const gone = render(<Region position={0} attach={false} />);
    gone.rerender(<Region position={1} attach={false} />);
    expect(animate).not.toHaveBeenCalled();

    reduceMotion(false, false);
    wide.rerender(<Region position={2} stillWhen="(min-width: 1024px)" />);
    expect(animate).toHaveBeenCalledOnce();

    Reflect.deleteProperty(HTMLElement.prototype, "animate");
    const old = render(<Region position={0} />);
    expect(() => old.rerender(<Region position={1} />)).not.toThrow();
  });
});
