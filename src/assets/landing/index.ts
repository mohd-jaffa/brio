import type { StaticImageData } from "next/image";

import analytics from "./analytics.webp";
import bill from "./bill.webp";
import customer from "./customer.webp";
import desktopHome from "./desktop-home.webp";
import home from "./home.webp";
import inventory from "./inventory.webp";
import newOrder from "./new-order.webp";

/**
 * The landing page's screenshots (plan §139.11.22), made by
 * scripts/landing-shots.mts from a demo business it makes and deletes again.
 * Each phone shot is a whole screen of a current Pro phone — status bar, the
 * app and the home indicator — for `PhoneFrame` to close round; the desktop
 * one is the app at 1440 × 900, for `LaptopFrame`.
 */
export const LANDING_SHOTS = {
  home,
  "new-order": newOrder,
  bill,
  customer,
  inventory,
  analytics,
  "desktop-home": desktopHome,
} as const satisfies Record<string, StaticImageData>;

export type LandingShot = keyof typeof LANDING_SHOTS;
