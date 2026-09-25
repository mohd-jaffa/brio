import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useOpeningKey } from "@/hooks/useOpeningKey";

describe("useOpeningKey", () => {
  it("changes with each opening, and holds while closed and while open", () => {
    const { result, rerender } = renderHook(({ open }) => useOpeningKey(open), { initialProps: { open: false } });
    const closed = result.current;
    rerender({ open: false });
    expect(result.current).toBe(closed);

    rerender({ open: true });
    const first = result.current;
    expect(first).not.toBe(closed);
    rerender({ open: true });
    expect(result.current).toBe(first);

    rerender({ open: false });
    expect(result.current).toBe(first);
    rerender({ open: true });
    expect(result.current).not.toBe(first);
  });

  it("gives a sheet that mounts open a key of its own", () => {
    const { result, rerender } = renderHook(({ open }) => useOpeningKey(open), { initialProps: { open: true } });
    const first = result.current;
    rerender({ open: false });
    rerender({ open: true });
    expect(result.current).not.toBe(first);
  });
});
