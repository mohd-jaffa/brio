import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useRequestKeys } from "@/hooks/useRequestKeys";

describe("useRequestKeys", () => {
  it("keeps the same keys across renders, so a retry after a re-render reuses its key", () => {
    const { result, rerender } = renderHook(() => useRequestKeys());
    const key = result.current.keyFor({ amount: 500 });
    rerender();
    expect(result.current.keyFor({ amount: 500 })).toBe(key);
  });
});
