import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UI_TEXT } from "@/constants/messages";
import type { InstallPlatform } from "@/lib/pwa/install";

const { install } = vi.hoisted(() => ({
  install: { current: { offered: true, canPrompt: false, platform: "ios" as InstallPlatform, install: vi.fn() } },
}));
vi.mock("@/hooks/useInstallApp", () => ({ useInstallApp: () => install.current }));

const { InstallAppSheet } = await import("@/components/nav/InstallAppSheet");

beforeEach(() => {
  install.current = { offered: true, canPrompt: false, platform: "ios", install: vi.fn() };
});

const sheet = () => screen.getByRole("dialog", { name: "Install Brio" });
const steps = () =>
  within(sheet())
    .getAllByRole("listitem")
    .map((step) => step.textContent);

describe("InstallAppSheet", () => {
  it("shows an iPhone's steps in Safari: Share, Add to Home Screen, Add — and why there is no Install button", () => {
    render(<InstallAppSheet open onClose={vi.fn()} />);
    expect(within(sheet()).getByRole("heading", { name: "On iPhone or iPad" })).toBeInTheDocument();
    expect(within(sheet()).getByText(UI_TEXT.install.iosNote)).toBeInTheDocument();
    expect(steps()).toEqual([
      "1Tap Share — in the toolbar, or under ••• beside the address bar.",
      "2Scroll down and tap Add to Home Screen.",
      "3Tap Add.",
    ]);
    expect(within(sheet()).queryByRole("button", { name: "Install" })).not.toBeInTheDocument();
  });

  it("keeps Chrome on an iPhone in Chrome, and any other iPhone browser in its own", () => {
    for (const [platform, first] of [
      ["iosChrome", "Tap Share, at the right of the address bar."],
      ["iosOther", "Tap the browser’s Share button, or open its menu and tap Share."],
    ] as const) {
      install.current = { ...install.current, platform };
      const { unmount } = render(<InstallAppSheet open onClose={vi.fn()} />);
      expect(within(sheet()).getByRole("heading", { name: "On iPhone or iPad" })).toBeInTheDocument();
      expect(within(sheet()).getByText(UI_TEXT.install.iosNote)).toBeInTheDocument();
      expect(steps()[0]).toBe(`1${first}`);
      expect(steps().join(" ")).not.toMatch(/Safari/);
      unmount();
    }
  });

  it("shows each device its own steps", () => {
    for (const [platform, heading, first] of [
      ["android", "On Android", "Open Brio in Chrome."],
      ["desktop", "On a computer", "Open Brio in Chrome or Edge."],
      ["other", "In your browser", "Open Brio in Chrome, Edge or Safari: this browser cannot install apps."],
    ] as const) {
      install.current = { ...install.current, platform };
      const { unmount } = render(<InstallAppSheet open onClose={vi.fn()} />);
      expect(within(sheet()).getByRole("heading", { name: heading })).toBeInTheDocument();
      expect(within(sheet()).queryByText(UI_TEXT.install.iosNote)).not.toBeInTheDocument();
      expect(steps()[0]).toBe(`1${first}`);
      unmount();
    }
  });

  it("asks the browser to install where it will, and closes once the owner takes it", async () => {
    const onClose = vi.fn();
    install.current = {
      ...install.current,
      platform: "android",
      canPrompt: true,
      install: vi.fn().mockResolvedValue(true),
    };
    render(<InstallAppSheet open onClose={onClose} />);
    expect(within(sheet()).getByRole("heading", { name: "Or follow these steps" })).toBeInTheDocument();
    await userEvent.click(within(sheet()).getByRole("button", { name: "Install" }));
    expect(install.current.install).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalled();
  });

  it("stays open when the owner turns the browser's offer down", async () => {
    const onClose = vi.fn();
    install.current = { ...install.current, canPrompt: true, install: vi.fn().mockResolvedValue(false) };
    render(<InstallAppSheet open onClose={onClose} />);
    await userEvent.click(within(sheet()).getByRole("button", { name: "Install" }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
