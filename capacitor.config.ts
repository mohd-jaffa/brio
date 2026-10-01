import type { CapacitorConfig } from "@capacitor/cli";

import { ANDROID_APP_ID } from "./src/constants/android";
import { HOME_ROUTE } from "./src/constants/routes";
import { shellServer } from "./src/lib/native/shell";

/**
 * The Android app (plan §139.17; the user, 2026-09-28): Brio's hosted web
 * app in a native shell, with the capabilities of `src/lib/native`. Android
 * only — there is no iOS app; iPhones use the installable web app.
 *
 * The shell loads the deployed app from `ANDROID_APP_URL` (see `.env.example`
 * and `src/lib/native/shell.ts`), so a web deploy updates the app. Capacitor
 * documents `server.url` as meant for live reload; the plan takes it on
 * knowingly (§139.17.1): every native call checks that its plugin is there,
 * and a bundled page stands in when the app cannot be reached.
 *
 * Sync with `npm run android:sync`, which builds that page first.
 */
const server = shellServer(process.env.ANDROID_APP_URL);

const config: CapacitorConfig = {
  appId: ANDROID_APP_ID,
  appName: "Brio",
  // The pages bundled into the app: built by scripts/android-shell.mjs, never committed.
  webDir: ".capacitor/shell",
  // The launch splash's cream (LaunchSplash), behind the page while it loads:
  // the system's splash, this and the splash are one colour.
  backgroundColor: "#fdfaf2",
  server: {
    url: server.url,
    // The app opens on Home: the site's root is the landing page, for visitors.
    appStartPath: HOME_ROUTE,
    cleartext: server.cleartext,
    // Shown when the app cannot be reached: no network, or the server is down.
    errorPath: "offline.html",
  },
  android: {
    // Tells the page it is in the Android app, before any script can ask
    // Capacitor: the launch splash shows for it (src/lib/launch/splash.ts).
    appendUserAgent: "BrioAndroid",
    allowMixedContent: false,
    // Inspectable from Chrome only when pointed at a development server.
    webContentsDebuggingEnabled: server.cleartext,
  },
  plugins: {
    // Edge to edge: the WebView reports the system bars' insets to the page,
    // which pays them through --safe-* (plan §139.8), and the bars' icons are
    // dark, for both themes' light grounds.
    SystemBars: {
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
      style: "LIGHT",
    },
  },
};

export default config;
