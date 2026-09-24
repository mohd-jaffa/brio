"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";

import {
  DEFAULT_THEME,
  THEME_COLORS,
  THEME_STORAGE_KEY,
  toTheme,
  type Theme,
} from "./themes";

export { THEME_LABELS, THEMES, type Theme } from "./themes";

/**
 * Which approved direction is in use (AGENTS.md §21). The truth is the
 * data-theme attribute on <html>: the pre-paint script in the root layout sets
 * it before anything is drawn (BUG-15), and every colour comes from the tokens
 * it switches (src/app/globals.css), so nothing else needs to know the theme.
 *
 * React reads it through useSyncExternalStore: the server and the first client
 * render both see the default, and React moves to the real value right after
 * hydration — no mismatch, and no flash, because the page already painted with
 * the attribute the script set.
 */

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const CHANGED = "ovenly:themechange";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  return () => window.removeEventListener(CHANGED, onChange);
}

const current = (): Theme => toTheme(document.documentElement.getAttribute("data-theme"));
const onServer = (): Theme => DEFAULT_THEME;

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not being able to remember the choice must not break the app.
  }
  window.dispatchEvent(new Event(CHANGED));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, current, onServer);

  const setTheme = useCallback((next: Theme) => apply(next), []);
  const toggleTheme = useCallback(() => apply(current() === "golden" ? "peach" : "golden"), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
