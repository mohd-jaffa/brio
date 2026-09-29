import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PRIVACY_POLICY } from "@/constants/privacy";

const { session, email } = vi.hoisted(() => ({
  session: { current: null as unknown },
  email: { current: null as string | null },
}));
vi.mock("@/features/auth/session.server", () => ({ readInitialSession: async () => session.current }));
vi.mock("@/lib/env/server", () => ({ supportEmail: () => email.current }));

const { default: PrivacyPage } = await import("@/app/privacy/page");

const show = async () => render(await PrivacyPage());

beforeEach(() => {
  session.current = null;
  email.current = "hello@brio.app";
});

describe("the privacy policy", () => {
  it("names itself, when it last changed, and every section in its contents", async () => {
    await show();
    expect(screen.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeInTheDocument();
    expect(screen.getByText(/^Last updated /)).toBeInTheDocument();
    const contents = screen.getByRole("navigation", { name: "On this page" });
    const links = within(contents).getAllByRole("link");
    expect(links).toHaveLength(PRIVACY_POLICY.sections.length);
    for (const [index, section] of PRIVACY_POLICY.sections.entries()) {
      expect(links[index]).toHaveAttribute("href", `#${section.id}`);
      expect(screen.getByRole("region", { name: section.heading })).toHaveAttribute("id", section.id);
    }
  });

  it("says who is responsible and what is kept", async () => {
    await show();
    expect(screen.getByRole("region", { name: "Who is responsible" })).toHaveTextContent("made and run by jaFFa");
    expect(screen.getByRole("region", { name: "What we keep" })).toHaveTextContent("one-way hash");
  });

  it("leads back to sign in for a visitor, and to Settings for an owner", async () => {
    const { unmount } = await show();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login");
    unmount();
    session.current = { profile: { name: "Asha" } };
    await show();
    expect(screen.getByRole("link", { name: "Back to Settings" })).toHaveAttribute("href", "/settings");
  });

  it("links to deleting the account, and to the address to write to", async () => {
    await show();
    expect(screen.getByRole("link", { name: "Delete my account" })).toHaveAttribute("href", "/settings/delete-account");
    expect(screen.getByRole("link", { name: "Write to hello@brio.app" })).toHaveAttribute(
      "href",
      "mailto:hello@brio.app",
    );
  });

  it("offers no address when none is set", async () => {
    email.current = null;
    await show();
    expect(screen.queryByRole("link", { name: /^Write to/ })).not.toBeInTheDocument();
  });
});
