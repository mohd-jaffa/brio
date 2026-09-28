import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Providers } from "@tests/support/providers";

const { install } = vi.hoisted(() => ({
  install: { current: { offered: true, canPrompt: false, platform: "android" as const, install: vi.fn() } },
}));
vi.mock("@/hooks/useInstallApp", () => ({ useInstallApp: () => install.current }));

const { InstallApp } = await import("@/components/nav/InstallApp");

beforeEach(() => {
  install.current = { offered: true, canPrompt: false, platform: "android", install: vi.fn() };
});

describe("InstallApp", () => {
  it("is a row among More's places on a phone, opening this device's steps", async () => {
    render(<InstallApp variant="row" />, { wrapper: Providers });
    const row = screen.getByRole("button", { name: /Install app/ });
    expect(row).toHaveTextContent("Add Brio to your home screen");
    await userEvent.click(row);
    expect(await screen.findByRole("dialog", { name: "Install Brio" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Install Brio" })).not.toBeInTheDocument();
  });

  it("is the sidebar's last place on a tablet and a desktop", async () => {
    render(<InstallApp variant="sidebar" />, { wrapper: Providers });
    const place = screen.getByRole("button", { name: "Install app" });
    expect(place).toHaveAttribute("aria-haspopup", "dialog");
    await userEvent.click(place);
    expect(await screen.findByRole("dialog", { name: "Install Brio" })).toBeInTheDocument();
  });

  it("is not there inside the installed app, nor before the browser has said", () => {
    install.current = { ...install.current, offered: false };
    render(
      <>
        <InstallApp variant="row" />
        <InstallApp variant="sidebar" />
      </>,
      { wrapper: Providers },
    );
    expect(screen.queryByRole("button", { name: /Install app/ })).not.toBeInTheDocument();
  });
});
