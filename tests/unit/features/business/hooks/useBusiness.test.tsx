import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBusiness } from "@/features/business/hooks/useBusiness";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ fetcher }));

function wrapper({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

beforeEach(() => {
  fetcher.mockReset();
  fetcher.mockResolvedValue({ id: "b-1", name: "Sweet Delights" });
});

describe("useBusiness", () => {
  it("reads the business once, however many parts of the shell ask", async () => {
    const { result } = renderHook(() => [useBusiness(), useBusiness()], { wrapper });

    await waitFor(() => expect(result.current[1].data).toEqual({ id: "b-1", name: "Sweet Delights" }));
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith("/api/business");
  });

  it("does not ask again just because the window came back into focus", async () => {
    const { result } = renderHook(() => useBusiness(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
