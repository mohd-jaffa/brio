/**
 * The approved visual directions (plan §139.4). Kept apart from the provider so
 * the root layout — a Server Component — can build the pre-paint script from
 * the same list the browser's picker uses.
 */
export const THEMES = ["golden", "peach"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "golden";

export const THEME_LABELS: Record<Theme, string> = {
  golden: "Golden",
  peach: "Peach",
};

/** The browser toolbar and the Android status bar take the page ground. */
export const THEME_COLORS: Record<Theme, string> = {
  golden: "#f6efe5",
  peach: "#fbeee6",
};

export const THEME_STORAGE_KEY = "ovenly_theme";

/** A stored "clean" — the direction Golden replaced — reads as Golden. */
const RENAMED: Record<string, Theme> = { clean: "golden" };

export function toTheme(value: string | null | undefined): Theme {
  if (!value) return DEFAULT_THEME;
  const renamed = RENAMED[value] ?? value;
  return (THEMES as readonly string[]).includes(renamed) ? (renamed as Theme) : DEFAULT_THEME;
}

/**
 * Runs in <head> before the first paint, so a Peach user never sees Golden
 * flash first (BUG-15): it applies the stored choice to <html> and to the
 * theme-color meta. It mirrors toTheme, and cannot import it — it is a string.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var r=${JSON.stringify(RENAMED)};t=r[t]||t;if(${JSON.stringify(THEMES)}.indexOf(t)<0)t=${JSON.stringify(
  DEFAULT_THEME,
)};var d=document.documentElement;d.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",${JSON.stringify(
  THEME_COLORS,
)}[t]);}catch(e){}})();`;
