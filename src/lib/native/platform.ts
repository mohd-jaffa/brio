import { Capacitor } from "@capacitor/core";

/**
 * Where the app is running (plan §139.17.2). The Android app is Brio in its
 * Capacitor shell; everything else — a browser, the installed web app — is
 * the web. On the server it is always the web.
 */
export function isAndroidApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

/**
 * Whether this build of the Android app carries a plugin. The app loads the
 * hosted web app, so a newer deploy may ask for one an older install lacks:
 * every native call checks first, and falls back to the web (§139.17.1).
 */
export function hasPlugins(...names: string[]): boolean {
  return isAndroidApp() && names.every((name) => Capacitor.isPluginAvailable(name));
}
