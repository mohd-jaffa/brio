import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useKept } from "@/hooks/useKept";

describe("useKept", () => {
  it("is the value while open, and the last one it had open while it closes", () => {
    const { result, rerender } = renderHook(({ value, open }) => useKept(value, open), {
      initialProps: { value: undefined as string | undefined, open: false },
    });
    expect(result.current).toBeUndefined();

    rerender({ value: "Brownies", open: true });
    expect(result.current).toBe("Brownies");

    rerender({ value: undefined, open: false });
    expect(result.current).toBe("Brownies");

    rerender({ value: "Cupcakes", open: true });
    expect(result.current).toBe("Cupcakes");
  });

  it("keeps an absent value while open as absent", () => {
    const { result, rerender } = renderHook(({ value, open }) => useKept(value, open), {
      initialProps: { value: "In stock" as string | undefined, open: true },
    });
    rerender({ value: undefined, open: true });
    expect(result.current).toBeUndefined();
    rerender({ value: undefined, open: false });
    expect(result.current).toBeUndefined();
  });
});
