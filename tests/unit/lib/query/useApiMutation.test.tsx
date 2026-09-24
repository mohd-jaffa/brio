import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { describe, expect, it, vi } from "vitest";

import { ERROR_MESSAGES } from "@/constants/messages";
import { ApiError } from "@/lib/api/client";

import { useApiMutation } from "@/lib/query/useApiMutation";

function wrapper({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

describe("useApiMutation", () => {
  it("starts idle", () => {
    const { result } = renderHook(() => useApiMutation(vi.fn()), { wrapper });
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("reports what came back and tells the caller it worked", async () => {
    const onSuccess = vi.fn();
    const run = vi.fn().mockResolvedValue({ id: "c-1" });

    const { result } = renderHook(() => useApiMutation(run, { onSuccess }), { wrapper });

    await act(async () => {
      await result.current.submit({ name: "Meena" });
    });

    expect(run).toHaveBeenCalledWith({ name: "Meena" });
    expect(onSuccess).toHaveBeenCalledWith({ id: "c-1" });
    expect(result.current.error).toBeNull();
  });

  it("shows the server's own words when a write is refused", async () => {
    const run = vi.fn(() => Promise.reject(new ApiError(409, "CONFLICT", "That phone number is taken.")));

    const { result } = renderHook(() => useApiMutation(run), { wrapper });

    await act(async () => {
      await result.current.submit(undefined);
    });

    await waitFor(() => expect(result.current.error).toBe("That phone number is taken."));
  });

  it("falls back to the catalogue when a failure has no words of its own", async () => {
    const run = vi.fn(() => Promise.reject(new TypeError("Failed to fetch")));

    const { result } = renderHook(() => useApiMutation(run), { wrapper });

    await act(async () => {
      await result.current.submit(undefined);
    });

    expect(result.current.error).toBe(ERROR_MESSAGES.SAVE_FAILED);
  });

  it("does not leave the form stuck submitting after a failure", async () => {
    const run = vi.fn(() => Promise.reject(new Error("nope")));
    const { result } = renderHook(() => useApiMutation(run), { wrapper });

    await act(async () => {
      await result.current.submit(undefined);
    });

    expect(result.current.submitting).toBe(false);
  });

  it("clears a failure when asked, so a retry starts clean", async () => {
    const run = vi.fn(() => Promise.reject(new Error("nope")));
    const { result } = renderHook(() => useApiMutation(run), { wrapper });

    await act(async () => {
      await result.current.submit(undefined);
    });
    act(() => result.current.reset());

    expect(result.current.error).toBeNull();
  });

  it("does not call onSuccess when the write failed", async () => {
    const onSuccess = vi.fn();
    const run = vi.fn(() => Promise.reject(new Error("nope")));

    const { result } = renderHook(() => useApiMutation(run, { onSuccess }), { wrapper });

    await act(async () => {
      await result.current.submit(undefined);
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });
});
