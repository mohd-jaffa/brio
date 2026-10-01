/**
 * Installing the app (plan §139.19 R7.3; the user, 2026-09-27): whether it is
 * already running installed, whether this browser offers to install it itself,
 * and which steps to show where it does not.
 *
 * Chrome, Edge and Samsung Internet offer it themselves, once, with
 * `beforeinstallprompt`: the offer is kept here until the owner asks for it.
 * No browser on an iPhone or iPad can: Apple lets no website offer to install.
 * There the steps are the way, through the browser's own Share menu — Safari's,
 * and since iOS 16.4 Chrome's and every other's too.
 */

/** The browser's own offer to install, as Chrome gives it. */
interface InstallOffer extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallState {
  /** Known only in the browser: the server cannot tell how the app was opened. */
  known: boolean;
  /** Running installed — from the home screen, full screen. */
  installed: boolean;
  /** The browser has offered to install, and the offer is still good. */
  canPrompt: boolean;
}

/** On the server, and before the browser has said: nothing to show yet. */
export const UNKNOWN: InstallState = { known: false, installed: false, canPrompt: false };

let offer: InstallOffer | null = null;
let installedNow = false;
let state: InstallState = UNKNOWN;
const listeners = new Set<() => void>();

/** Opened from the home screen: standalone, or Safari's own flag on iOS. */
export function runningInstalled(): boolean {
  const standalone = typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;
  return standalone || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function refresh() {
  state = { known: true, installed: installedNow || runningInstalled(), canPrompt: offer !== null };
  for (const listener of listeners) listener();
}

/**
 * Listens for the browser's offer and for the app being installed, from the
 * moment the page starts (`PwaSetup`). Answers a function that stops.
 */
export function listenForInstall(): () => void {
  const onOffer = (event: Event) => {
    // Kept for the owner to ask for, rather than shown by the browser now.
    event.preventDefault();
    offer = event as InstallOffer;
    refresh();
  };
  const onInstalled = () => {
    installedNow = true;
    offer = null;
    refresh();
  };
  window.addEventListener("beforeinstallprompt", onOffer);
  window.addEventListener("appinstalled", onInstalled);
  refresh();
  return () => {
    window.removeEventListener("beforeinstallprompt", onOffer);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function installState(): InstallState {
  return state;
}

/** Shows the browser's own offer; answers whether the owner took it. It can be shown once. */
export async function promptInstall(): Promise<boolean> {
  const shown = offer;
  if (!shown) return false;
  offer = null;
  refresh();
  await shown.prompt();
  const { outcome } = await shown.userChoice;
  return outcome === "accepted";
}

/** `ios` is Safari; `iosChrome` and `iosOther` are the other browsers on an iPhone or iPad. */
export type InstallPlatform = "ios" | "iosChrome" | "iosOther" | "android" | "desktop" | "other";

export const isIos = (platform: InstallPlatform) =>
  platform === "ios" || platform === "iosChrome" || platform === "iosOther";

/**
 * Whose steps to show, from the browser's own description of itself. An iPad
 * describes itself as a Mac, and gives itself away by its touch screen. On
 * either, each browser keeps its Share button somewhere else, and says who it
 * is: CriOS is Chrome, FxiOS Firefox, EdgiOS Edge. Firefox on a computer cannot
 * install an app at all.
 */
export function installPlatform(userAgent: string, touchPoints = 0): InstallPlatform {
  if (/iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && touchPoints > 1)) {
    if (/CriOS\//.test(userAgent)) return "iosChrome";
    if (/FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo|YaBrowser|GSA\//.test(userAgent)) return "iosOther";
    return "ios";
  }
  if (/Android/.test(userAgent)) return "android";
  if (/Firefox\//.test(userAgent)) return "other";
  return "desktop";
}

/** Forgets everything, for a test to start clean. */
export function resetInstall() {
  offer = null;
  installedNow = false;
  state = UNKNOWN;
  listeners.clear();
}
