/**
 * Where the Android app's shell loads Brio from (plan §139.17.1; the user,
 * 2026-09-28: the hosted app in a native shell). `capacitor.config.ts` and
 * `scripts/android-shell.mjs` read it from `ANDROID_APP_URL` when the Android
 * project is synced; nothing in the running app does.
 *
 * - **A release** loads the deployed app over HTTPS.
 * - **An emulator or a phone on the same network** may load a development
 *   server over plain HTTP — the emulator reaches the Mac as `10.0.2.2` —
 *   which is the only case the WebView is allowed cleartext.
 */
export interface ShellServer {
  /** The origin the WebView opens, with no path: sign-in and every screen hang off it. */
  url: string;
  /** Its host, which the app's links are verified for (App Links). */
  host: string;
  /** Plain HTTP, allowed only for a development server on a private address. */
  cleartext: boolean;
}

// Addresses only a development machine answers on.
const PRIVATE_HOST =
  /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;

export function shellServer(address: string | undefined): ShellServer {
  if (!address) {
    throw new Error(
      "ANDROID_APP_URL is not set: the address the Android app loads, e.g. https://app.example.com (or http://10.0.2.2:3000 for an emulator).",
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(address);
  } catch {
    throw new Error(`ANDROID_APP_URL is not an address: ${address}`);
  }
  const cleartext = parsed.protocol === "http:";
  if (parsed.protocol !== "https:" && !cleartext) {
    throw new Error(`ANDROID_APP_URL must be https (or http for a development server): ${address}`);
  }
  if (cleartext && !PRIVATE_HOST.test(parsed.hostname)) {
    throw new Error(
      `ANDROID_APP_URL may use plain http only for a development server on a private address: ${address}`,
    );
  }
  return { url: parsed.origin, host: parsed.hostname, cleartext };
}
