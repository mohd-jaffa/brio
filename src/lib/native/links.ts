import { hasPlugins } from "./platform";

/**
 * A link of this site that Android opened in the app (App Links, R8.5): the
 * email confirmation. Android starts the app, or brings it forward, with the
 * link, and `open` is handed the page it names — its path, query and fragment
 * — to show in place of the one showing. The App plugin keeps a link that
 * started the app until something listens, so it is not lost while the app
 * loads. Only a page of this site: never another's. In a browser it does
 * nothing; there the link simply opens.
 */
export function onAppLinkOpened(open: (path: string) => void): () => void {
  if (!hasPlugins("App")) return () => undefined;
  let stop: (() => void) | undefined;
  let gone = false;
  void import("@capacitor/app").then(async ({ App }) => {
    const listener = await App.addListener("appUrlOpen", ({ url }) => {
      const path = pageOfThisSite(url);
      if (path) open(path);
    });
    if (gone) void listener.remove();
    else stop = () => void listener.remove();
  });
  return () => {
    gone = true;
    stop?.();
  };
}

function pageOfThisSite(url: string): string | null {
  let link: URL;
  try {
    link = new URL(url);
  } catch {
    return null;
  }
  if (link.origin !== window.location.origin) return null;
  return `${link.pathname}${link.search}${link.hash}`;
}
