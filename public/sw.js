/*
 * Brio's service worker (plan §139.19 R7.2; §51: not offline-first in V1).
 *
 * It runs in the browser, on the owner's own device — nothing on the server
 * (the user, 2026-09-27). It keeps the smallest thing that is safe to keep:
 *
 * - **The app's own files** — Next's hashed scripts, styles and fonts, the
 *   bill's fonts and the icons — once each, from the cache first. A hashed
 *   file never changes, so a cached one is never stale.
 * - **The offline page**, fetched without the session's cookies, so it holds
 *   nothing of whoever was signed in. A screen that cannot be reached shows it.
 * - **Nothing else.** No screen and no API answer is ever cached: one
 *   account's orders or customers can never be shown to the next, or to
 *   anyone offline.
 *
 * The page names its version in the address it registers (`/sw.js?v=…`), so a
 * new release installs afresh and the old caches go.
 */
const VERSION = new URL(self.location.href).searchParams.get("v") || "0";
const CACHE = `brio-static-${VERSION}`;
const OFFLINE_URL = "/offline";

/** The app's own files that never change once built, and may be kept. */
function isStatic(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/fonts/") ||
      url.pathname.startsWith("/icons/"))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { credentials: "omit" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      // Every cache on this origin is the worker's own: an older release's, or
      // one kept under an earlier name.
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

/** From the cache first, and kept on the way through if it came back whole. */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const kept = await cache.match(request);
  if (kept) return kept;
  const answer = await fetch(request);
  if (answer.ok && answer.type === "basic") await cache.put(request, answer.clone());
  return answer;
}

/** A screen from the network; the offline page only when the network cannot answer. */
async function screen(request) {
  try {
    return await fetch(request);
  } catch (failure) {
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    throw failure;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.mode === "navigate") {
    event.respondWith(screen(request));
    return;
  }
  if (isStatic(new URL(request.url))) event.respondWith(cacheFirst(request));
});

// The page sends the files it loaded before this worker was running, so the
// offline page finds its styles and fonts already kept. Only the app's own
// unchanging files are taken.
self.addEventListener("message", (event) => {
  const { type, urls } = event.data || {};
  if (type !== "KEEP_FILES" || !Array.isArray(urls)) return;
  const keep = urls.filter((url) => typeof url === "string" && isStatic(new URL(url, self.location.origin)));
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        keep.map(async (url) => {
          if (await cache.match(url)) return;
          try {
            await cache.add(url);
          } catch {
            // A file that cannot be fetched now is fetched the next time it is used.
          }
        }),
      ),
    ),
  );
});
