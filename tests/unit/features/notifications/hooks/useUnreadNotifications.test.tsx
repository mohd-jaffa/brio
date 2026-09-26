import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NOTIFICATION_REFRESH_MS } from "@/constants/limits";

const useApiQuery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/query/useApiQuery", () => ({ useApiQuery }));

import { useUnreadNotifications } from "@/features/notifications/hooks/useUnreadNotifications";

beforeEach(() => useApiQuery.mockReset());

describe("useUnreadNotifications", () => {
  it("counts what waits unread, asking again every so often", async () => {
    useApiQuery.mockReturnValue({ data: { unread: 3 } });
    const { result } = renderHook(() => useUnreadNotifications());
    await waitFor(() => expect(result.current).toBe(3));
    expect(useApiQuery).toHaveBeenCalledWith("/api/notifications/unread", { refreshInterval: NOTIFICATION_REFRESH_MS });
  });

  it("counts none until it knows", () => {
    useApiQuery.mockReturnValue({ data: undefined });
    expect(renderHook(() => useUnreadNotifications()).result.current).toBe(0);
  });
});
