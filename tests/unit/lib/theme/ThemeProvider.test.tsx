import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme } from "@/lib/theme/ThemeProvider";

const wrapper = ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;

beforeEach(() => {
  document.head.innerHTML = '<meta name="theme-color" content="#f6efe5">';
});

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  vi.restoreAllMocks();
});

describe("ThemeProvider", () => {
  it("starts on Golden when nothing has been chosen", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("golden");
  });

  it("reads the theme the boot script already put on <html>", () => {
    document.documentElement.setAttribute("data-theme", "peach");
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("peach");
  });

  it("switches the whole app, the toolbar colour and the stored choice at once", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.setTheme("peach"));

    expect(result.current.theme).toBe("peach");
    expect(document.documentElement.getAttribute("data-theme")).toBe("peach");
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#fbeee6");
    expect(window.localStorage.getItem("ovenly_theme")).toBe("peach");
  });

  it("toggles between the two approved directions", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("peach");

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("golden");
  });

  it("reads the retired Clean as Golden", () => {
    document.documentElement.setAttribute("data-theme", "clean");
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("golden");
  });

  it("still switches where site data is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.setTheme("peach"));
    expect(result.current.theme).toBe("peach");
  });

  it("must be used inside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(/ThemeProvider/);
  });
});
