import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { addProduct, newDraft } from "@/features/orders/draft";
import { useOrderDraft } from "@/features/orders/hooks/useOrderDraft";
import { clearUserItems, readUserItem } from "@/lib/storage/userStorage";

afterEach(() => {
  act(() => clearUserItems());
  localStorage.clear();
});

describe("useOrderDraft", () => {
  it("has nothing until it knows who is signed in", () => {
    const { result } = renderHook(() => useOrderDraft(null));
    expect(result.current.draft).toBeNull();
    act(() => result.current.update((draft) => addProduct(draft, "p-1")));
    act(() => result.current.clear());
    expect(result.current.draft).toBeNull();
    expect(result.current.keyFor({ a: 1 })).not.toBe(result.current.keyFor({ a: 1 }));
  });

  it("has nothing on the server, which cannot see the device's storage", () => {
    function Probe() {
      return String(useOrderDraft("u-1").draft);
    }
    expect(renderToString(createElement(Probe))).toBe("null");
  });

  it("starts a fresh draft, and keeps every change on the device (§110)", () => {
    const { result } = renderHook(() => useOrderDraft("u-1"));
    expect(result.current.draft).toMatchObject({ lines: [], customer: null });

    act(() => result.current.update((draft) => addProduct(draft, "p-1")));
    expect(result.current.draft?.lines).toHaveLength(1);
    expect(readUserItem<{ lines: unknown[] }>("u-1", "order_draft")?.lines).toHaveLength(1);
  });

  it("comes back as it was after a refresh", () => {
    const stored = addProduct(newDraft(), "p-9");
    localStorage.setItem("ovenly_user:u-2:order_draft", JSON.stringify(stored));
    const { result } = renderHook(() => useOrderDraft("u-2"));
    expect(result.current.draft?.lines[0].productId).toBe("p-9");
  });

  it("starts again when cleared, and when anyone signs out", () => {
    const { result } = renderHook(() => useOrderDraft("u-1"));
    act(() => result.current.update((draft) => addProduct(draft, "p-1")));
    act(() => result.current.clear());
    expect(result.current.draft?.lines).toEqual([]);

    act(() => result.current.update((draft) => addProduct(draft, "p-1")));
    act(() => clearUserItems());
    expect(result.current.draft?.lines).toEqual([]);
  });

  it("places the same request with the same key, even after a refresh, and a new one after clearing (§133.3 C2)", () => {
    const first = renderHook(() => useOrderDraft("u-1"));
    const key = first.result.current.keyFor({ total: 100 });
    expect(first.result.current.keyFor({ total: 100 })).toBe(key);
    expect(first.result.current.keyFor({ total: 200 })).not.toBe(key);

    const again = first.result.current.keyFor({ total: 200 });
    first.unmount();
    // A refresh: the module's memory is gone, the device's is not.
    act(() => clearUserItemsInMemoryOnly());
    const second = renderHook(() => useOrderDraft("u-1"));
    expect(second.result.current.keyFor({ total: 200 })).toBe(again);

    act(() => second.result.current.clear());
    expect(second.result.current.keyFor({ total: 200 })).not.toBe(again);
  });
});

/**
 * What a refresh leaves: storage kept, memory lost. Clearing the user's items
 * drops the memory; the stored request is put back as the device kept it.
 */
function clearUserItemsInMemoryOnly() {
  const kept = { ...localStorage };
  clearUserItems();
  for (const [key, value] of Object.entries(kept)) localStorage.setItem(key, value);
}
