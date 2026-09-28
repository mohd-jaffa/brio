import type { CapacitorConfig } from "@capacitor/cli";

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
  appId: "in.brio.app",
  appName: "Brio",
  // The pages bundled into the app: built by scripts/android-shell.mjs, never committed.
  webDir: ".capacitor/shell",
  // Golden's ground, behind the page while it loads.
  backgroundColor: "#f6efe5",
  server: {
    url: server.url,
    cleartext: server.cleartext,
    // Shown when the app cannot be reached: no network, or the server is down.
    errorPath: "offline.html",
  },
  android: {
    // Lets the server tell the Android app from a browser, should it need to.
    appendUserAgent: "BrioAndroid",
    allowMixedContent: false,
    // Inspectable from Chrome only when pointed at a development server.
    webContentsDebuggingEnabled: server.cleartext,
  },
};

export default config;
