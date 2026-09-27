import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MORE_NAV } from "@/constants/navigation";
import { ResponseProvider } from "@/components/ui/response-card";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { authStub } from "@tests/support/auth";

import { MoreSheet } from "@/components/nav/MoreSheet";

const { auth } = vi.hoisted(() => ({ auth: { current: {} as ReturnType<typeof authStub> } }));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));

beforeEach(() => {
  auth.current = authStub();
});

const sheet = (props: { isOpen: boolean; onClose?: () => void }) =>
  render(
    <ThemeProvider>
      <ResponseProvider>
        <MoreSheet onClose={vi.fn()} {...props} />
      </ResponseProvider>
    </ThemeProvider>,
  );

describe("MoreSheet", () => {
  it("is out of sight while it is closed", () => {
    const { container } = sheet({ isOpen: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("lists what the bottom bar does not hold, each with its medallion and a line on what it holds", () => {
    sheet({ isOpen: true });
    const places = within(screen.getByRole("navigation", { name: "Secondary navigation" })).getAllByRole("link");
    expect(places.map((link) => link.querySelector(".font-semibold")?.textContent)).toEqual(
      MORE_NAV.map((item) => item.label),
    );
    for (const item of MORE_NAV) {
      const link = screen.getByRole("link", { name: new RegExp(`^${item.label}`) });
      expect(link).toHaveAttribute("href", item.href);
      expect(link.querySelector(".bg-primary-soft")).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /^Analytics/ })).toHaveTextContent("How the business is doing");
  });

  it("ends with Sign out, which asks first and then closes it; the theme is on Settings", async () => {
    const onClose = vi.fn();
    sheet({ isOpen: true, onClose });
    expect(screen.queryByRole("radiogroup", { name: "Theme" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Sign out/ }));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(
      within(screen.getByRole("alertdialog", { name: "Sign out?" })).getByRole("button", { name: "Sign out" }),
    );
    expect(onClose).toHaveBeenCalled();
    expect(auth.current.signOut).toHaveBeenCalledOnce();
  });

  it("closes on Escape and from its close button", async () => {
    const onClose = vi.fn();
    sheet({ isOpen: true, onClose });
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("closes when a place is chosen, so the sheet is not left over the new screen", async () => {
    const onClose = vi.fn();
    // jsdom cannot navigate, so the click is stopped before it tries.
    const stopNavigation = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("click", stopNavigation);
    sheet({ isOpen: true, onClose });
    await userEvent.click(screen.getByRole("link", { name: /^Settings/ }));
    document.removeEventListener("click", stopNavigation);
    expect(onClose).toHaveBeenCalled();
  });
});
