import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useRememberedRange } from "@/hooks/useRememberedRange";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("useRememberedRange", () => {
  it("starts at the last 30 days, and remembers a choice for its screen only", () => {
    const { result } = renderHook(() => useRememberedRange("analytics"));
    expect(result.current[0]).toEqual({ preset: "LAST_30_DAYS" });

    act(() => result.current[1]({ preset: "CUSTOM", from: "2026-09-01", to: "2026-09-10" }));
    expect(result.current[0]).toEqual({ preset: "CUSTOM", from: "2026-09-01", to: "2026-09-10" });

    expect(renderHook(() => useRememberedRange("analytics")).result.current[0].preset).toBe("CUSTOM");
    expect(renderHook(() => useRememberedRange("expenses")).result.current[0].preset).toBe("LAST_30_DAYS");
  });

  it("starts fresh from something it cannot read", () => {
    localStorage.setItem("ovenly_range_analytics", "{broken");
    expect(renderHook(() => useRememberedRange("analytics")).result.current[0].preset).toBe("LAST_30_DAYS");
    localStorage.setItem("ovenly_range_analytics", JSON.stringify({ preset: "LAST_YEAR" }));
    expect(renderHook(() => useRememberedRange("analytics")).result.current[0].preset).toBe("LAST_30_DAYS");
    localStorage.setItem("ovenly_range_analytics", JSON.stringify({ from: "2026-09-01" }));
    expect(renderHook(() => useRememberedRange("analytics")).result.current[0].preset).toBe("LAST_30_DAYS");
  });

  it("still shows a choice it could not keep", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const { result } = renderHook(() => useRememberedRange("analytics"));
    act(() => result.current[1]({ preset: "LAST_7_DAYS" }));
    expect(result.current[0].preset).toBe("LAST_7_DAYS");
  });
});
