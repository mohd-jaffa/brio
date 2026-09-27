/**
 * Changes the address without asking the server for the page again: a step
 * of Create order (`?step=`) is the same screen, and its state is already here.
 * Next's router follows the browser's history, so `useSearchParams` sees the
 * change at once.
 */
export function pushUrl(url: string) {
  window.history.pushState(null, "", url);
}

export function replaceUrl(url: string) {
  window.history.replaceState(null, "", url);
}

/**
 * Loads a screen afresh, as a new page: what signing in, signing out and
 * confirming an email do. Nothing held in memory for one account — cached
 * rows, screens' state, the page's own first data — can outlive it into the
 * next, and the server draws the new account's screen with its data.
 */
export function loadPage(url: string) {
  window.location.replace(url);
}
