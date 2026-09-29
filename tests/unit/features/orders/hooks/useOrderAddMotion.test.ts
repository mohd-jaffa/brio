import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const choreography = vi.hoisted(() => ({
  captureOrderAdd: vi.fn(),
  playOrderAdd: vi.fn(),
}));
vi.mock("@/features/orders/choreography", () => choreography);

import { useOrderAddMotion } from "@/features/orders/hooks/useOrderAddMotion";

const order = () =>
  renderHook(({ count }: { count: number }) => useOrderAddMotion(count), { initialProps: { count: 0 } });

beforeEach(() => {
  choreography.captureOrderAdd.mockReset();
  choreography.playOrderAdd.mockReset();
});

describe("useOrderAddMotion", () => {
  it("holds a pressed + until the order has grown, then plays it once", () => {
    const origin = document.createElement("button");
    const ticket = { productId: "cake", origin: new DOMRect(), token: origin };
    choreography.captureOrderAdd.mockReturnValue(ticket);
    const { result, rerender } = order();

    result.current("cake", origin);
    expect(choreography.captureOrderAdd).toHaveBeenCalledWith(origin, "cake");
    expect(choreography.playOrderAdd).not.toHaveBeenCalled();

    rerender({ count: 1 });
    expect(choreography.playOrderAdd).toHaveBeenCalledOnce();
    expect(choreography.playOrderAdd.mock.calls[0][0]).toBe(ticket);

    rerender({ count: 2 });
    expect(choreography.playOrderAdd).toHaveBeenCalledOnce();
  });

  it("keeps nothing for a + that has no layout to fly from", () => {
    choreography.captureOrderAdd.mockReturnValue(null);
    const { result, rerender } = order();
    result.current("cake", document.createElement("button"));
    rerender({ count: 1 });
    expect(choreography.playOrderAdd).not.toHaveBeenCalled();
  });
});
