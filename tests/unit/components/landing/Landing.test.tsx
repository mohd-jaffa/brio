import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Landing } from "@/components/landing/Landing";
import { UI_TEXT } from "@/constants/messages";

const text = UI_TEXT.landing;
const show = (signedIn = false) => render(<Landing signedIn={signedIn} year={2026} />);

// The day's pinned phone asks the screen's width (DayOnOnePhone).
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true })),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("the landing page", () => {
  it("says what Brio is in its own line, and who it is for", () => {
    show();
    expect(screen.getByRole("heading", { level: 1, name: "Made by you. Managed simply." })).toBeInTheDocument();
    expect(screen.getByText(text.heroLead)).toBeInTheDocument();
    const who = screen.getByRole("region", { name: text.whoTitle });
    expect(
      within(who)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["Home bakers", "Hamper makers", "Florists", "Gift makers"]);
  });

  it("walks a day's work on the app's own screens, each named for a screen reader", () => {
    show();
    const day = screen.getByRole("region", { name: text.dayTitle });
    for (const feature of Object.values(text.features)) {
      const step = within(day).getByRole("listitem", { name: feature.title });
      for (const point of feature.points) expect(within(step).getByText(point)).toBeInTheDocument();
    }
    // The day's phone shows one screen at a time; the rest wait, out of reach.
    for (const alt of Object.values(text.shots))
      expect(screen.getAllByRole("img", { name: alt, hidden: true }).length).toBeGreaterThan(0);
  });

  it("says where it runs, and what is kept private, with the policy a link away", () => {
    show();
    const devices = screen.getByRole("region", { name: text.devicesTitle });
    expect(within(devices).getAllByRole("heading", { level: 3 })).toHaveLength(3);
    const trust = screen.getByRole("region", { name: text.trustTitle });
    for (const point of text.trust) expect(within(trust).getByText(point)).toBeInTheDocument();
    expect(within(trust).getByRole("link", { name: text.privacyLink })).toHaveAttribute("href", "/privacy");
  });

  it("leads a visitor to make an account, or to sign in", () => {
    show();
    for (const link of screen.getAllByRole("link", { name: text.start }))
      expect(link).toHaveAttribute("href", "/register");
    for (const link of screen.getAllByRole("link", { name: text.signIn }))
      expect(link).toHaveAttribute("href", "/login");
    expect(screen.getAllByRole("link", { name: text.createAccount })[0]).toHaveAttribute("href", "/register");
    expect(screen.queryByRole("link", { name: text.openApp })).not.toBeInTheDocument();
    expect(screen.getByText(text.haveAccount)).toBeInTheDocument();
  });

  it("leads someone signed in back into the app instead", () => {
    show(true);
    for (const link of screen.getAllByRole("link", { name: text.openApp })) expect(link).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: text.signIn })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: text.start })).not.toBeInTheDocument();
    expect(screen.queryByText(text.haveAccount)).not.toBeInTheDocument();
  });

  it("closes on the policy, the way in, and the year", () => {
    show();
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: text.privacy })).toHaveAttribute("href", "/privacy");
    expect(within(footer).getByText("© 2026 Brio")).toBeInTheDocument();
    expect(within(footer).getByText(UI_TEXT.appTagline)).toBeInTheDocument();
  });
});
