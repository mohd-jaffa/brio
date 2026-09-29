import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLeaving } from "@/hooks/useLeaving";
import { EXIT_MS } from "@/lib/motion";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useLeaving", () => {
  it("says nothing is leaving while it stays, or was never there", () => {
    const { result, rerender } = renderHook(({ present }) => useLeaving(present), { initialProps: { present: true } });
    expect(result.current).toBe(false);
    rerender({ present: true });
    expect(result.current).toBe(false);

    const absent = renderHook(() => useLeaving(false));
    expect(absent.result.current).toBe(false);
  });

  it("is leaving from the render it goes in, for as long as an exit plays", () => {
    const { result, rerender } = renderHook(({ present }) => useLeaving(present), { initialProps: { present: true } });
    rerender({ present: false });
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(EXIT_MS - 1));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });

  it("stops leaving when it comes back before it has gone", () => {
    const { result, rerender } = renderHook(({ present }) => useLeaving(present), { initialProps: { present: true } });
    rerender({ present: false });
    rerender({ present: true });
    expect(result.current).toBe(false);
    // The exit's timer went with it: going again leaves for a whole exit.
    act(() => vi.advanceTimersByTime(EXIT_MS / 2));
    rerender({ present: false });
    act(() => vi.advanceTimersByTime(EXIT_MS - 1));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });
});
