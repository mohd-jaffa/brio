import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { THEME_BOOT_SCRIPT, THEME_COLORS, THEMES, toTheme } from "@/lib/theme/themes";

describe("toTheme", () => {
  it("keeps an approved direction", () => {
    for (const theme of THEMES) expect(toTheme(theme)).toBe(theme);
  });

  it("reads the retired Clean as Golden, so nobody loses their choice", () => {
    expect(toTheme("clean")).toBe("golden");
  });

  it("falls back to Golden for nothing, or anything else", () => {
    expect(toTheme(null)).toBe("golden");
    expect(toTheme("neon")).toBe("golden");
  });
});

/** Runs the pre-paint script exactly as the browser would, from its string. */
const boot = () => new Function(THEME_BOOT_SCRIPT)();

describe("the pre-paint theme script (BUG-15)", () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="theme-color" content="#f6efe5">';
    document.documentElement.setAttribute("data-theme", "golden");
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("applies the stored theme to <html> and to the toolbar colour", () => {
    window.localStorage.setItem("ovenly_theme", "peach");
    boot();
    expect(document.documentElement.getAttribute("data-theme")).toBe("peach");
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", THEME_COLORS.peach);
  });

  it("treats a stored Clean as Golden", () => {
    window.localStorage.setItem("ovenly_theme", "clean");
    boot();
    expect(document.documentElement.getAttribute("data-theme")).toBe("golden");
  });

  it("ignores a stored value that is not a direction", () => {
    window.localStorage.setItem("ovenly_theme", "<script>");
    boot();
    expect(document.documentElement.getAttribute("data-theme")).toBe("golden");
  });

  it("never throws where storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(boot).not.toThrow();
    expect(document.documentElement.getAttribute("data-theme")).toBe("golden");
  });
});
