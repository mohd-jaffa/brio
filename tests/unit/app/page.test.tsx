import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UI_TEXT } from "@/constants/messages";

const session = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/features/auth/session.server", () => ({ readInitialSession: async () => session.current }));

const { default: LandingPage, metadata } = await import("@/app/page");

beforeEach(() => {
  session.current = null;
  // The day's pinned phone asks the screen's width (DayOnOnePhone).
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true })),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("the landing page's route", () => {
  it("is named and described for a search or a shared link, as the site's own page", () => {
    expect(metadata).toMatchObject({
      title: UI_TEXT.appTitle,
      description: UI_TEXT.landing.metaDescription,
      alternates: { canonical: "/" },
      openGraph: { title: UI_TEXT.appTitle, description: UI_TEXT.landing.metaDescription, url: "/" },
      twitter: { card: "summary_large_image", description: UI_TEXT.landing.metaDescription },
    });
  });

  it("offers an account to a visitor, and the app to someone signed in", async () => {
    const { unmount } = render(await LandingPage());
    expect(screen.getAllByRole("link", { name: UI_TEXT.landing.start })).not.toHaveLength(0);
    expect(screen.getByText(`© ${new Date().getFullYear()} Brio`)).toBeInTheDocument();
    unmount();

    session.current = { profile: { id: "u-1" } };
    render(await LandingPage());
    expect(screen.getAllByRole("link", { name: UI_TEXT.landing.openApp })).not.toHaveLength(0);
  });
});
