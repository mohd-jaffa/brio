import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAnimatedValues, type AnimatedValue } from "@/hooks/useAnimatedValues";

let nextFrame = 1;
let frames = new Map<number, FrameRequestCallback>();

function step(now: number) {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(now));
}

beforeEach(() => {
  nextFrame = 1;
  frames = new Map();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, "matchMedia");
});

describe("useAnimatedValues", () => {
  it("keeps the shown values, then eases every matched value to the next set together", () => {
    const initial = [
      { key: "first", value: 10 },
      { key: "second", value: 20 },
    ];
    const { result, rerender } = renderHook(({ values }: { values: AnimatedValue[] }) => useAnimatedValues(values), {
      initialProps: { values: initial },
    });

    expect(result.current).toEqual([10, 20]);
    expect(frames).toHaveLength(0);

    rerender({
      values: [
        { key: "first", value: 30 },
        { key: "second", value: 40 },
      ],
    });
    expect(result.current).toEqual([10, 20]);

    act(() => step(0));
    expect(result.current).toEqual([10, 20]);
    act(() => step(260));
    expect(result.current[0]).toBeCloseTo(29.375);
    expect(result.current[1]).toBeCloseTo(39.375);
    act(() => step(520));
    expect(result.current).toEqual([30, 40]);
    expect(frames).toHaveLength(0);
  });

  it("changes at once when reduced motion is requested", () => {
    window.matchMedia = vi.fn(() => ({ matches: true })) as unknown as typeof window.matchMedia;
    const { result, rerender } = renderHook(({ values }: { values: AnimatedValue[] }) => useAnimatedValues(values), {
      initialProps: { values: [{ key: "total", value: 10 }] },
    });

    rerender({ values: [{ key: "total", value: 80 }] });
    expect(result.current).toEqual([80]);
    expect(frames).toHaveLength(0);
  });
});
