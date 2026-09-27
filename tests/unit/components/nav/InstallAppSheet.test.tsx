import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InstallPlatform } from "@/lib/pwa/install";

const { install } = vi.hoisted(() => ({
  install: { current: { offered: true, canPrompt: false, platform: "ios" as InstallPlatform, install: vi.fn() } },
}));
vi.mock("@/hooks/useInstallApp", () => ({ useInstallApp: () => install.current }));

const { InstallAppSheet } = await import("@/components/nav/InstallAppSheet");

beforeEach(() => {
  install.current = { offered: true, canPrompt: false, platform: "ios", install: vi.fn() };
});

const sheet = () => screen.getByRole("dialog", { name: "Install Ovenly" });
const steps = () => within(sheet()).getAllByRole("listitem").map((step) => step.textContent);

describe("InstallAppSheet", () => {
  it("shows an iPhone's steps: Safari, Share, Add to Home Screen", () => {
    render(<InstallAppSheet open onClose={vi.fn()} />);
    expect(within(sheet()).getByRole("heading", { name: "On iPhone or iPad" })).toBeInTheDocument();
    expect(steps()).toEqual([
      "1Open Ovenly in Safari.",
      "2Tap the Share button at the bottom of the screen.",
      "3Scroll down and tap Add to Home Screen, then Add.",
    ]);
    expect(within(sheet()).queryByRole("button", { name: "Install" })).not.toBeInTheDocument();
  });

  it("shows each device its own steps", () => {
    for (const [platform, heading, first] of [
      ["android", "On Android", "Open Ovenly in Chrome."],
      ["desktop", "On a computer", "Open Ovenly in Chrome or Edge."],
      ["other", "In your browser", "Open Ovenly in Chrome, Edge or Safari: this browser cannot install apps."],
    ] as const) {
      install.current = { ...install.current, platform };
      const { unmount } = render(<InstallAppSheet open onClose={vi.fn()} />);
      expect(within(sheet()).getByRole("heading", { name: heading })).toBeInTheDocument();
      expect(steps()[0]).toBe(`1${first}`);
      unmount();
    }
  });

  it("asks the browser to install where it will, and closes once the owner takes it", async () => {
    const onClose = vi.fn();
    install.current = { ...install.current, platform: "android", canPrompt: true, install: vi.fn().mockResolvedValue(true) };
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
