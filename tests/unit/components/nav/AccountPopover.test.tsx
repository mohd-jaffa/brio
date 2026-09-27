import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResponseProvider } from "@/components/ui/response-card";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { authStub } from "@tests/support/auth";

import { AccountPopover } from "@/components/nav/AccountPopover";

const { auth } = vi.hoisted(() => ({ auth: { current: {} as ReturnType<typeof authStub> } }));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));

beforeEach(() => {
  auth.current = authStub();
});

const popover = () =>
  render(
    <ThemeProvider>
      <ResponseProvider>
        <p>Outside</p>
        <AccountPopover />
      </ResponseProvider>
    </ThemeProvider>,
  );

const button = () => screen.getByRole("button", { name: "Account: Asha Baker" });

describe("AccountPopover", () => {
  it("names the account and opens who is signed in and Sign out", async () => {
    popover();
    expect(button()).toHaveAttribute("aria-expanded", "false");
    expect(button().querySelector("img")?.getAttribute("src")).toContain("husky");
    expect(screen.queryByRole("button", { name: /Sign out/ })).not.toBeInTheDocument();

    await userEvent.click(button());
    expect(button()).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("radiogroup", { name: "Theme" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign out/ })).toBeInTheDocument();
    expect(document.getElementById(button().getAttribute("aria-controls")!)).not.toHaveAttribute("hidden");

    await userEvent.click(button());
    expect(button()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape, giving focus back, and on a click elsewhere", async () => {
    popover();
    await userEvent.click(button());
    await userEvent.keyboard("{Escape}");
    expect(button()).toHaveAttribute("aria-expanded", "false");
    expect(button()).toHaveFocus();

    await userEvent.click(button());
    await userEvent.click(screen.getByText("Owner"));
    expect(button()).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(screen.getByText("Outside"));
    expect(button()).toHaveAttribute("aria-expanded", "false");
    await userEvent.keyboard("{Escape}");
  });

  it("closes as the account signs out", async () => {
    popover();
    await userEvent.click(button());
    await userEvent.click(screen.getByRole("button", { name: /Sign out/ }));
    await userEvent.click(
      within(screen.getByRole("alertdialog", { name: "Sign out?" })).getByRole("button", { name: "Sign out" }),
    );
    expect(button()).toHaveAttribute("aria-expanded", "false");
    expect(auth.current.signOut).toHaveBeenCalled();
  });

  it("is not there without an account", () => {
    auth.current = authStub({ profile: null });
    popover();
    expect(screen.queryByRole("button", { name: /Account/ })).not.toBeInTheDocument();
  });
});
