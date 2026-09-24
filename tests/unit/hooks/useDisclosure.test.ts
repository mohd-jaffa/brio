import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useDisclosure } from "@/hooks/useDisclosure";

describe("useDisclosure", () => {
  it("starts closed with nothing chosen", () => {
    const { result } = renderHook(() => useDisclosure<string>());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.subject).toBeUndefined();
  });

  it("opens on a subject, for editing that record", () => {
    const { result } = renderHook(() => useDisclosure<string>());

    act(() => result.current.open("customer-1"));

    expect(result.current.isOpen).toBe(true);
    expect(result.current.subject).toBe("customer-1");
  });

  it("opening with nothing clears the record before — that is how a new one starts blank", () => {
    const { result } = renderHook(() => useDisclosure<string>());

    act(() => result.current.open("customer-1"));
    act(() => result.current.close());
    act(() => result.current.open());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.subject).toBeUndefined();
  });

  it("closes", () => {
    const { result } = renderHook(() => useDisclosure());

    act(() => result.current.open());
    act(() => result.current.close());

    expect(result.current.isOpen).toBe(false);
  });
});
