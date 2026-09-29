import { AUTH_ROUTES, HOME_ROUTE } from "@/constants/routes";

/**
 * Android's back button (plan §139.17.3), one step at a time: a list that is
 * open (a choice, a calendar) closes; then the card or sheet on top; then the
 * screen goes back; and where there is nowhere to go back to — Home, or
 * signing in — the app is left.
 *
 * It closes things the way Escape does, so each keeps its own rules: a card
 * that waits for an answer stays until it has one.
 */
export type BackStep = "CLOSED_LIST" | "CLOSED_LAYER" | "WENT_BACK" | "LEAVE";

// Where back leaves the app rather than going back further.
const STARTS = new Set<string>([HOME_ROUTE, AUTH_ROUTES.signIn]);

export function goBack(canGoBack: boolean): BackStep {
  const list = [...document.querySelectorAll<HTMLElement>("[popover]")].find((element) =>
    element.matches(":popover-open"),
  );
  if (list) {
    // The list's own control, or the list, answers Escape (select-menu, date-picker).
    (document.activeElement ?? document.body).dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    return "CLOSED_LIST";
  }
  const layers = document.querySelectorAll<HTMLDialogElement>("dialog[open]");
  const top = layers[layers.length - 1];
  if (top) {
    top.dispatchEvent(new Event("cancel", { cancelable: true }));
    return "CLOSED_LAYER";
  }
  if (canGoBack && !STARTS.has(window.location.pathname)) {
    window.history.back();
    return "WENT_BACK";
  }
  return "LEAVE";
}
