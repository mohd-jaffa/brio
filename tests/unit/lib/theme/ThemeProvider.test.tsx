import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme } from "@/lib/theme/ThemeProvider";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

const wrapper = ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;

describe("ThemeProvider", () => {
  it("starts on the Clean direction", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("clean");
  });

  it("switches the whole app by setting one attribute", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.setTheme("peach"));

    expect(document.documentElement.getAttribute("data-theme")).toBe("peach");
    expect(window.localStorage.getItem("ovenly_theme")).toBe("peach");
  });

  it("toggles between the two approved directions", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("peach");

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("clean");
  });

  it("remembers the choice between visits", () => {
    window.localStorage.setItem("ovenly_theme", "peach");
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("peach");
  });

  it("ignores a stored value that is not one of the directions", () => {
    window.localStorage.setItem("ovenly_theme", "neon");
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("clean");
  });

  it("still works where site data is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("clean");
  });

  it("refuses to be used outside the provider, rather than silently doing nothing", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(/ThemeProvider/);
  });

  it("gives its children the choice", async () => {
    function Swatch() {
      const { theme, toggleTheme } = useTheme();
      return <button onClick={toggleTheme}>{theme}</button>;
    }

    render(
      <ThemeProvider>
        <Swatch />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "clean" }));
    expect(screen.getByRole("button", { name: "peach" })).toBeInTheDocument();
  });
});
