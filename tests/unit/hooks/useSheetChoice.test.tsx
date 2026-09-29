import { act, renderHook } from "@testing-library/react";
import type { KeyboardEvent } from "react";
import { describe, expect, it, vi } from "vitest";

import { useSheetChoice } from "@/hooks/useSheetChoice";

const press = (key: string) => ({ key, preventDefault: vi.fn() }) as unknown as KeyboardEvent;

function choosing(values: readonly string[], inUse: string | null, open = true) {
  return renderHook(({ values, inUse, open }) => useSheetChoice(values, inUse, open), {
    initialProps: { values, inUse, open },
  });
}

describe("useSheetChoice (audit A3)", () => {
  it("holds the choice in use, the one Tab stop, and moves it with the arrows", () => {
    const { result } = choosing(["a", "b", "c"], "b");
    expect(result.current.checked("b")).toBe(true);
    expect(["a", "b", "c"].map(result.current.tabIndex)).toEqual([-1, 0, -1]);
    act(() => result.current.onKeyDown(press("ArrowDown")));
    expect(result.current.checked("c")).toBe(true);
    expect(result.current.checked("b")).toBe(false);
  });

  it("with nothing in use, marks nothing and lets Tab in at the first", () => {
    const { result } = choosing(["a", "b"], null);
    expect(["a", "b"].some(result.current.checked)).toBe(false);
    expect(result.current.tabIndex("a")).toBe(0);
  });

  it("marks nothing once the choice in hand is no longer offered — a search moved on", () => {
    const { result, rerender } = choosing(["a", "b"], "b");
    rerender({ values: ["a"], inUse: "b", open: true });
    expect(result.current.checked("a")).toBe(false);
    expect(result.current.tabIndex("a")).toBe(0);
  });

  it("starts again from the choice in use each time the sheet opens", () => {
    const { result, rerender } = choosing(["a", "b", "c"], "a");
    act(() => result.current.onKeyDown(press("End")));
    expect(result.current.checked("c")).toBe(true);
    rerender({ values: ["a", "b", "c"], inUse: "a", open: false });
    expect(result.current.checked("c")).toBe(true);
    rerender({ values: ["a", "b", "c"], inUse: "a", open: true });
    expect(result.current.checked("a")).toBe(true);
  });
});
