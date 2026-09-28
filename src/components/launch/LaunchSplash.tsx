import type { CSSProperties } from "react";

import { BRAND } from "@/assets/brand";
import { SPLASH_ART } from "@/assets/splash";
import { UI_TEXT } from "@/constants/messages";
import { assetUrl, LAUNCH } from "@/lib/launch/splash";

/**
 * The launch splash (the user, 2026-09-28): the bakery scene, the wordmark,
 * the line and a bar that fills as the launch goes. Drawn with every page and
 * shown only while <html data-launch> is set (`launchBootScript`), so an
 * ordinary visit neither sees it nor downloads its art: the pictures are
 * backgrounds, fetched only once it shows. The script moves the bar before
 * React has hydrated, so the bar's own attributes are left to it.
 */
export function LaunchSplash() {
  const art = {
    "--launch-portrait": `url(${assetUrl(SPLASH_ART.portrait)})`,
    "--launch-landscape": `url(${assetUrl(SPLASH_ART.landscape)})`,
    "--launch-wordmark": `url(${assetUrl(BRAND.wordmark.src)})`,
  } as CSSProperties;

  return (
    <div id={LAUNCH.id} className="launch-splash" style={art}>
      <div className="launch-splash-content">
        <span role="img" aria-label={UI_TEXT.appName} className="launch-splash-wordmark" />
        <p className="launch-splash-line">{UI_TEXT.appTagline}</p>
        <div
          id={`${LAUNCH.id}-track`}
          role="progressbar"
          aria-label={UI_TEXT.launch.opening}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          className="launch-splash-track"
          suppressHydrationWarning
        >
          <span id={`${LAUNCH.id}-bar`} className="launch-splash-bar" suppressHydrationWarning />
        </div>
      </div>
    </div>
  );
}
