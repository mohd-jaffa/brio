"use client";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { UI_TEXT } from "@/constants/messages";
import { THEME_LABELS, THEMES } from "@/lib/theme/themes";
import { useTheme } from "@/lib/theme/ThemeProvider";

const OPTIONS = THEMES.map((theme) => ({ value: theme, label: THEME_LABELS[theme] }));

/**
 * Golden or Peach. It lives in the More sheet and the account menu until
 * Settings → Appearance takes it over (R5.11); it used to be a pill in the
 * header, which the new top bar has no room for.
 */
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  return <SegmentedControl label={UI_TEXT.nav.theme} value={theme} options={OPTIONS} onChange={setTheme} />;
}
