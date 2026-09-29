/** The app's own files the page loaded before the service worker ran, for it to keep. */
function loadedFiles(): string[] {
  return performance
    .getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((url) => {
      const { origin, pathname } = new URL(url);
      return (
        origin === window.location.origin && (pathname.startsWith("/_next/static/") || pathname.startsWith("/fonts/"))
      );
    });
}

/**
 * Puts the service worker (public/sw.js; plan §139.19 R7.2) in charge of the
 * page, in a built app only: in development Next's files change under the
 * same names, and a kept one would be stale, so a worker left from a build
 * is taken away instead. It runs in the browser; nothing runs on the server
 * for it. The release is in its address, so a new one installs afresh.
 */
export async function setUpServiceWorker(version: string, production = process.env.NODE_ENV === "production") {
  if (!("serviceWorker" in navigator)) return;
  if (!production) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    return;
  }
  await navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(version || "0")}`, { scope: "/" });
  const ready = await navigator.serviceWorker.ready;
  ready.active?.postMessage({ type: "KEEP_FILES", urls: loadedFiles() });
}
