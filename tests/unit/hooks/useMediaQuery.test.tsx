import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { useMediaQuery } from "@/hooks/useMediaQuery";

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
});

describe("useMediaQuery", () => {
  it("follows the query as the window changes", () => {
    let matches = false;
    const listeners = new Set<() => void>();
    window.matchMedia = ((query: string) => ({
      media: query,
      get matches() {
        return matches;
      },
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    })) as unknown as typeof window.matchMedia;

    const { result, unmount } = renderHook(() => useMediaQuery("(min-width: 1024px)"));
    expect(result.current).toBe(false);

    act(() => {
      matches = true;
      listeners.forEach((listener) => listener());
    });
    expect(result.current).toBe(true);

    unmount();
    expect(listeners.size).toBe(0);
  });

  it("reads false on the server, where there is no window to ask", () => {
    function Probe() {
      return useMediaQuery("(min-width: 1024px)") ? "desktop" : "phone";
    }
    expect(renderToString(<Probe />)).toBe("phone");
  });

  it("reads false where the browser has no media queries", () => {
    Reflect.deleteProperty(window, "matchMedia");
    expect(renderHook(() => useMediaQuery("(min-width: 1024px)")).result.current).toBe(false);
  });
});
