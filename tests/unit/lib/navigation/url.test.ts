import { afterEach, describe, expect, it, vi } from "vitest";

import { loadPage, pushUrl, replaceUrl } from "@/lib/navigation/url";

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("changing the address", () => {
  it("adds a step to the history, or changes the one in place, without leaving the page", () => {
    const length = window.history.length;
    pushUrl("/orders/new?step=details");
    expect(window.location.pathname + window.location.search).toBe("/orders/new?step=details");
    expect(window.history.length).toBe(length + 1);

    replaceUrl("/orders/new");
    expect(window.location.search).toBe("");
    expect(window.history.length).toBe(length + 1);
  });

  it("loads a new page for a new account, in place of this one", () => {
    const replace = vi.fn();
    vi.stubGlobal("location", { ...window.location, replace });
    loadPage("/");
    expect(replace).toHaveBeenCalledWith("/");
  });
});
