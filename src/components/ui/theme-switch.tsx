"use client";

import { UI_TEXT } from "@/constants/messages";
import { THEME_LABELS, THEMES } from "@/lib/theme/themes";
import { useTheme } from "@/lib/theme/ThemeProvider";

import { SegmentedControl } from "./segmented-control";

const OPTIONS = THEMES.map((theme) => ({ value: theme, label: THEME_LABELS[theme] }));

/**
 * Golden or Peach (plan §139.4), on Settings → Appearance (R5.11). The
 * choice is kept on the device.
 */
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  return <SegmentedControl label={UI_TEXT.nav.theme} value={theme} options={OPTIONS} onChange={setTheme} />;
}
