import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useArrived } from "@/hooks/useArrived";

describe("useArrived", () => {
  it("says nothing of what was there from the start", () => {
    const { result, rerender } = renderHook(({ present }) => useArrived(present), { initialProps: { present: true } });
    expect(result.current).toBe(false);
    rerender({ present: true });
    expect(result.current).toBe(false);
  });

  it("says so of what appears after being absent, every time it comes back", () => {
    const { result, rerender } = renderHook(({ present }) => useArrived(present), { initialProps: { present: false } });
    expect(result.current).toBe(false);
    rerender({ present: true });
    expect(result.current).toBe(true);
    rerender({ present: true });
    expect(result.current).toBe(true);
  });

  it("counts something that was there at first, went, and came back as arrived", () => {
    const { result, rerender } = renderHook(({ present }) => useArrived(present), { initialProps: { present: true } });
    rerender({ present: false });
    expect(result.current).toBe(false);
    rerender({ present: true });
    expect(result.current).toBe(true);
  });

  it("takes nothing from an absence while what it depends on is still loading", () => {
    const { result, rerender } = renderHook(({ present, known }) => useArrived(present, known), {
      initialProps: { present: false, known: false },
    });
    rerender({ present: true, known: true });
    expect(result.current).toBe(false);
    rerender({ present: false, known: true });
    rerender({ present: true, known: true });
    expect(result.current).toBe(true);
  });
});
