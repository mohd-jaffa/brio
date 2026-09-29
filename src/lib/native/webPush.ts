import { postJson } from "@/lib/api/client";
import { publicVapidKey } from "@/lib/env/public";
import { apiRoutes } from "@/lib/query/keys";

import type { ReminderPermission } from "./reminders";

/**
 * Order reminders pushed to the web app (R8.6; the user, 2026-09-29): the
 * browser's half of reminders. The browser subscribes with its push service
 * and hands the subscription to the server, which pushes each notice due to
 * it (`pushToBusiness`); the service worker shows them (public/sw.js).
 *
 * Only where it can work: a browser with push, a service worker in charge
 * (a built app), and the app's public key. On an iPhone that means Brio added
 * to the Home Screen: Safari offers push to an installed web app only.
 */

function supported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    publicVapidKey() !== ""
  );
}

/** The service worker in charge of the app, if any: only a built app has one. */
async function worker(): Promise<ServiceWorkerRegistration | undefined> {
  return supported() ? navigator.serviceWorker.getRegistration() : undefined;
}

/** A base64url key as the bytes `subscribe` takes. */
function keyBytes(key: string): Uint8Array<ArrayBuffer> {
  const base64 = key.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(key.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

/** On once the browser allows it and this browser is subscribed; off before; blocked once refused. */
export async function webPushPermission(): Promise<ReminderPermission> {
  const registration = await worker();
  if (!registration) return "UNSUPPORTED";
  if (Notification.permission === "denied") return "BLOCKED";
  if (Notification.permission === "granted" && (await registration.pushManager.getSubscription())) return "ON";
  return "OFF";
}

/**
 * Asks the browser, subscribes, and tells the server. If the server cannot be
 * told, the subscription is dropped again and the failure thrown, so the row
 * reads off rather than on with nothing behind it.
 */
export async function turnOnWebPush(): Promise<ReminderPermission> {
  const registration = await worker();
  if (!registration) return "UNSUPPORTED";
  const answer = await Notification.requestPermission();
  if (answer === "denied") return "BLOCKED";
  if (answer !== "granted") return "OFF";

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicVapidKey()) }));
  try {
    await postJson(apiRoutes.notifications.devices, subscription.toJSON());
  } catch (failure) {
    await subscription.unsubscribe();
    throw failure;
  }
  return "ON";
}

/**
 * Tells the server again, as the app opens: the subscription stays this
 * account's, its last sight is renewed, and one the server lost is restored.
 */
export async function renewWebPush(): Promise<void> {
  const subscription = await (await worker())?.pushManager.getSubscription();
  if (subscription && Notification.permission === "granted") {
    await postJson(apiRoutes.notifications.devices, subscription.toJSON());
  }
}

/**
 * Stops this browser's pushes as the account leaves it. The session is gone by
 * then, so the server is not told: its next push finds the subscription gone,
 * and lets it go (`pushToBusiness`).
 */
export async function stopWebPush(): Promise<void> {
  const subscription = await (await worker())?.pushManager.getSubscription();
  await subscription?.unsubscribe();
}
