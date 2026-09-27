import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useOpenScreen } from "@/hooks/useOpenScreen";
import { readNavigation, settleNavigation } from "@/lib/navigation/pending";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => settleNavigation());

describe("useOpenScreen", () => {
  it("goes to the screen as a link would, saying a navigation has begun", () => {
    const { result } = renderHook(() => useOpenScreen());
    result.current("/orders/o-1");
    expect(push).toHaveBeenCalledWith("/orders/o-1");
    expect(readNavigation()).toBe("starting");
  });
});
