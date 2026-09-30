import type { LandingShot } from "@/assets/landing";
import { UI_TEXT } from "@/constants/messages";

const text = UI_TEXT.landing;

/** What each screenshot shows, for a screen reader. */
export const SHOT_ALT: Record<LandingShot, string> = {
  home: text.shots.home,
  "new-order": text.shots.order,
  bill: text.shots.bill,
  customer: text.shots.customer,
  inventory: text.shots.inventory,
  analytics: text.shots.analytics,
  "desktop-home": text.shots.desktop,
};
