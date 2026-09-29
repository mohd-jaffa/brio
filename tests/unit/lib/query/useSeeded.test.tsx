import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { describe, expect, it } from "vitest";

import { useSeeded } from "@/lib/query/useSeeded";

function withCache(cache: Map<string, unknown>, fallback: Record<string, unknown>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <SWRConfig value={{ provider: () => cache as never, fallback }}>{children}</SWRConfig>;
  };
}

describe("useSeeded", () => {
  it("is true while the page's own data is what is shown", () => {
    const { result } = renderHook(() => useSeeded("/api/products"), {
      wrapper: withCache(new Map(), { "/api/products": [] }),
    });
    expect(result.current).toBe(true);
  });

  it("is false once the browser has read the key itself, or when nothing was brought for it", () => {
    const read = new Map<string, unknown>([["/api/products", { data: [{ id: "p" }] }]]);
    expect(
      renderHook(() => useSeeded("/api/products"), { wrapper: withCache(read, { "/api/products": [] }) }).result
        .current,
    ).toBe(false);
    expect(renderHook(() => useSeeded("/api/orders"), { wrapper: withCache(new Map(), {}) }).result.current).toBe(
      false,
    );
    expect(renderHook(() => useSeeded(null), { wrapper: withCache(new Map(), {}) }).result.current).toBe(false);
  });
});
